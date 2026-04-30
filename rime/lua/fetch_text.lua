local function shell_escape(value)
  return '"' .. string.gsub(value, '"', '\\"') .. '"'
end

local function write_temp_file(content)
  local base = os.getenv("TEMP") or os.getenv("TMP") or "."
  local name = string.format(
    "%s\\llm-ime-%d-%d.tmp",
    base,
    os.time(),
    math.random(100000, 999999)
  )
  local file = assert(io.open(name, "wb"))
  file:write(content)
  file:close()
  return name
end

local function fetch_text(url, op)
  local response_file = write_temp_file("")
  local request_file = nil

  local command = string.format(
    'curl.exe -sS -o %s -w "%%{http_code}" --request %s --url %s',
    shell_escape(response_file),
    op.method or "GET",
    shell_escape(url)
  )

  if op.connect_timeout then
    command = command .. string.format(
      " --connect-timeout %s",
      tostring(op.connect_timeout)
    )
  end

  if op.timeout then
    command = command .. string.format(
      " --max-time %s",
      tostring(op.timeout)
    )
  end

  if op.headers then
    for key, value in pairs(op.headers) do
      command = command .. string.format(
        " --header %s",
        shell_escape(key .. ": " .. value)
      )
    end
  end

  if op.source then
    request_file = write_temp_file(op.source)
    command = command .. string.format(
      " --data-binary %s",
      shell_escape("@" .. request_file)
    )
  end

  local handle = io.popen(command)
  if not handle then
    if request_file then
      os.remove(request_file)
    end
    os.remove(response_file)
    return nil, "无法执行 curl.exe"
  end

  local status_output = handle:read("*a")
  handle:close()

  local response_handle = io.open(response_file, "rb")
  local body = ""
  if response_handle then
    body = response_handle:read("*a") or ""
    response_handle:close()
  end

  if request_file then
    os.remove(request_file)
  end
  os.remove(response_file)

  local status_code = tonumber(status_output)
  if status_code == nil and body == "" then
    return nil, "curl 请求失败或超时"
  end
  return status_code, body
end

return fetch_text
