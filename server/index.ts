import 'reflect-metadata'
import * as express from 'express'
import { createConnection } from 'typeorm'
import * as bodyParser from 'body-parser'
import * as cookieParse from 'cookie-parser'
// 对commonjs导出的包做导入兼容
import session = require('express-session')
import { attachControllers } from '@decorators/express/lib'
import verfiryToken from './src/verifyRealize'

// 导入所有控制器数组
import controllers from './src/controller/index'

// createConnection会自动搜寻根目录下的ormconfig.json配置文件，进行数据库连接和建表
createConnection().then(async connection => {
  // 这里可以写实体操作相关的代码
  const app = express()

  // CORS跨域配置，不安全，使用nginx代理client请求
  app.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    if (req.method == 'OPTIONS'){
      // 让option请求快速返回
      res.sendStatus(200)
    }
    else {
      next()
    }
  })

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(cookieParse())

  // 没有sessionId的验证，存储在内存中的session将无法验证是哪个用户的session
  app.use(session({
    name: '_blogSid_', // cookie名称
    secret: 'secret', // 对sessionId相关会话进行签名
    saveUninitialized: false, // 不保存未初始化的会话
    resave: false, // 是否每次都重新保存会话，建议false
    cookie: {
      // 客户端重定向
      httpOnly: false, // 允许客户端读写cookie
      maxAge: 1000 * 60 * 30 // 有效时间三十分钟
    }
  }))

  app.use(verfiryToken) // token认证

  // 注册所有控制器，实现路由控制
  attachControllers(app, controllers)

  // 404
  app.use(function (req, res, next) {
    const err: any = new Error('Not Found!')
    err.status = 404
    // 额外传入的参数会在下一个中间件被发现
    next(err)
  })

  // 500
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.json({
      code: err.status,
      msg: err.toString()
    })
  })

  app.listen(3001, '0.0.0.0', function () {
    console.log("Express application is up and running on port 3001")
  })

}).catch(error => console.log("TypeORM connection error: ", error))