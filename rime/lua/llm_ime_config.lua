return {
  base_url = "http://127.0.0.1:5000",
  shared_secret = "",
  -- 为避免 RIME 在服务异常时长时间阻塞，默认使用较短超时
  connect_timeout_seconds = 0.2,
  request_timeout_seconds = 1.5,
}
