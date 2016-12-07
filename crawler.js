const http = require('http')
const fs = require('fs')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const url = require('url')
const mime = require('mime')

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
    case 'PUT':
    case 'DELETE':
    default:
      res.writeHead(405, 'Method Not Allowed')
      res.end()
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
    _getNews(req, res);
  } else {
    res.writeHead(403, 'Forbidden')
    res.writeHead(400, 'Bad Request')
    res.end()
  }

  function _getNews (req, res) {
    // 获取数据
    if (!cache.length) { // 第一次获取
      catchNews().then(res => {
        cache = res
        __renderAndReturn()
      }, err => {
        console.log(err)
      })
    } else { // 若不是第一次
      catchNews().then(res => {
        let newData = res
        let newSum = filter(newData) // 过滤数据，返回新数据的条数
        if (newSum) {
          cache.unshift(newData.slice(0, newSum)) // 获取新数据并将其移入缓存的最前面
        }
        __renderAndReturn()
      }, err => {
        console.log(err)
      })
    }

    function __renderAndReturn () {
      // 渲染页面，返回html页面
      let page = render('./template.html', cache)

      // 设置响应头
      // res.setHeader({
      //   // 'Content-Type': mime.lookup(page),
      //   'Content-Type': 'text/html',
      //   'Content-Length': Buffer.byteLength(page)
      // })
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(page)
      })

      // 响应页面
      res.end(page)
    }
  }
}


/**********************************以上为主逻辑********************************/

function catchNews () {
  return new Promise((resolve, reject) => {
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
        let rstArr = []

        $('#news #indexNewsWrap .new-warp .new a').each((idx, v) => {
          rst += (idx + 1) + '.' + $(v).find('h3').text() + '\n'
                 + '链接：' + $(v).attr('href') + '\n'
                 + '时间：' + $(v).siblings().find('.fl').data('time') + '\n'

          rstArr.push({
            id: idx,
            title: $(v).find('h3').text(),
            url: $(v).attr('href'),
            time: $(v).siblings().find('.fl').data('time')
          })
        })

        fs.writeFileSync('./result.txt', rst)
        resolve(rstArr)
      })
    }).on('error', (err) => {
      reject(err)
    })
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
  let tpl = fs.readFileSync(templateUrl).toString()
  const dataList = dataToList(data)
  const page = tpl.replace('{{content}}', dataList)

  return page
}

function dataToList (data) {
  let rst = ''
  data.forEach(v => {
    rst += `<a href="${v.url}">${v.title}</a>
            <div>${v.time}</div>`
  })
  return rst
}
