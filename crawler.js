const http = require('http')
const fs = require('fs')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')

// 缓存
const cache = []

const server = http.createServer((req, res) => {
  cache = catchNews()

  res.setHeader({
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(cache)
  })
})

server.listen(3333)

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
