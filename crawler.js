const http = require('http')
const fs = require('fs')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const url = require('url')

// 抓取的新闻缓存
let cache = []

// 服务器运行逻辑
http.createServer((req, res) => {
  // 判断请求方法
  switch(req.method) {
    case 'GET':
      get(req, res)
      break
    case 'POST':
      post(req, res)
      break
    case 'PUT':
      put(req, res)
      break
    case 'DELETE':
    default:
  }
}).listen(3333, () => {
  console.log('正在监听端口3333')
})

// 当请求方法为get时，执行此方法
function get (req, res) {
  // 判断路径
  const urlObj = url.parse(req.url)
  const pathname = urlObj.pathname
  if (pathname === '/') {
    getNews(req, res);
  } else {
    res.writeHead(404)
    res.end(404)
  }

  // 获取数据
  if (!cache.length) { // 第一次获取
    cache = catchNews()
  } else { // 若不是第一次
    let newData = catchNews()
    let newSum = filter(newData) // 过滤数据，返回新数据的条数
    cache.unshift(newData.slice(0, newSum)) // 获取新数据并将其移入缓存的最前面
  }

  // 渲染页面，返回html页面
  let page = render(cache)

  // 设置响应头
  res.setHeader({
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(page)
  })
  res.write()

  // 响应页面
  res.end(page)
}

/**********************************以上为主逻辑********************************/

function catchNews () {
  http.get('http://china.nba.com/', (res) => {
    // 直接写入文件
    // const ws = fs.createWriteStream('./result.html')
    // const cs = iconv.decodeStream('gb2312');
    // res.pipe(cs)
    //    .pipe(ws)

    let result = []
    let length = 0
    res.on('data', (data) => {
      result.push(data)
      length += data.length
    })
    res.on('end', () => {
      let d = Buffer.concat(result, length)
      d = iconv.decode(d, 'gb2312')

      const $ = cheerio.load(d)
      const ws = fs.createWriteStream
      let rst = ''

      $('#news #indexNewsWrap .new-warp .new a').each((idx, v) => {
        rst += (idx + 1) + '.' + $(v).find('h3').text() + '\n'
               + '链接：' + $(v).attr('href') + '\n'
               + '时间：' + $(v).siblings().find('.fl').data('time') + '\n'
      })

      fs.writeFileSync('./result.txt', rst)
    })
  }).on('error', (err) => {
    console.log(err)
  })
}

function filter (data) {
  // 从新获取的信息中取出最新的第一条
  // 与缓存中的第一条比较
  // 若相同则返回空
  // 若不同则取出新信息的第二条
  // ...

  for (let i = 0; i < data.length; i++) {
    if (data[i].href === cache[i].href) {
      return i
    }
  }
}

function render (templateUrl, data) {
  let tpl = fs.readFileSync(templateUrl)
  const dataList = dataToList(data)
  const page = tpl.replace('{{content}}', dataList)

  return page
}

function dataToList (data) {
  data.forEach()
}
