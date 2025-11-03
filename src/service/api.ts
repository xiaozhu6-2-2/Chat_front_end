import axios from 'axios';
const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000'
const noauthApi = axios.create({
  baseURL: `${baseURL}`
})
const authApi = axios.create({
  baseURL: `${baseURL}/auth`
})

//axios拦截器interceptors
//request选择请求拦截器/response选择响应拦截器
//use创造拦截器对象，需要传入两个回调函数
authApi.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    //发送请求是异步的过程，拦截器也是其中的一环，出错必须返回promise.reject
    //如果直接返回error，实际上也是promiss.resolve，后续的.then会被执行
    return Promise.reject(error)
  }
)

//使用时直接 authApi.post('/FriendRequest', data)
//这样路径直接就是 'baseURL/auth/FriendRequest'，请求头也自带token
export { noauthApi, authApi }