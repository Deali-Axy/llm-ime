local json = {}

local escapes = {
  ['"'] = '\\"',
  ["\\"] = "\\\\",
  ["\b"] = "\\b",
  ["\f"] = "\\f",
  ["\n"] = "\\n",
  ["\r"] = "\\r",
  ["\t"] = "\\t",
}

local function is_array(value)
  local max_index = 0
  local count = 0
  for key, _ in pairs(value) do
    if type(key) ~= "number" or key <= 0 or key % 1 ~= 0 then
      return false
    end
    if key > max_index then
      max_index = key
    end
    count = count + 1
  end
  return max_index == count
end

local function encode_string(value)
  return '"' .. value:gsub('[%z\1-\31\\"]', function(char)
    return escapes[char] or string.format("\\u%04x", char:byte())
  end) .. '"'
end

local function encode_value(value)
  local value_type = type(value)
  if value_type == "nil" then
    return "null"
  end
  if value_type == "boolean" or value_type == "number" then
    return tostring(value)
  end
  if value_type == "string" then
    return encode_string(value)
  end
  if value_type ~= "table" then
    error("不支持的 JSON 类型: " .. value_type)
  end

  if is_array(value) then
    local parts = {}
    for i = 1, #value do
      parts[#parts + 1] = encode_value(value[i])
    end
    return "[" .. table.concat(parts, ",") .. "]"
  end

  local parts = {}
  for key, item in pairs(value) do
    parts[#parts + 1] = encode_string(tostring(key)) .. ":" .. encode_value(item)
  end
  return "{" .. table.concat(parts, ",") .. "}"
end

function json.encode(value)
  return encode_value(value)
end

local function create_decoder(input)
  local index = 1

  local function skip_whitespace()
    while true do
      local char = input:sub(index, index)
      if char == "" or not char:match("%s") then
        return
      end
      index = index + 1
    end
  end

  local parse_value

  local function parse_string()
    index = index + 1
    local parts = {}
    while true do
      local char = input:sub(index, index)
      if char == "" then
        error("JSON 字符串未闭合")
      end
      if char == '"' then
        index = index + 1
        return table.concat(parts)
      end
      if char == "\\" then
        local esc = input:sub(index + 1, index + 1)
        if esc == '"' or esc == "\\" or esc == "/" then
          parts[#parts + 1] = esc
          index = index + 2
        elseif esc == "b" then
          parts[#parts + 1] = "\b"
          index = index + 2
        elseif esc == "f" then
          parts[#parts + 1] = "\f"
          index = index + 2
        elseif esc == "n" then
          parts[#parts + 1] = "\n"
          index = index + 2
        elseif esc == "r" then
          parts[#parts + 1] = "\r"
          index = index + 2
        elseif esc == "t" then
          parts[#parts + 1] = "\t"
          index = index + 2
        elseif esc == "u" then
          local hex = input:sub(index + 2, index + 5)
          if #hex < 4 or not hex:match("^%x%x%x%x$") then
            error("无效的 Unicode 转义")
          end
          local code = tonumber(hex, 16)
          if code <= 0x7F then
            parts[#parts + 1] = string.char(code)
          elseif code <= 0x7FF then
            parts[#parts + 1] = string.char(
              0xC0 + math.floor(code / 0x40),
              0x80 + (code % 0x40)
            )
          else
            parts[#parts + 1] = string.char(
              0xE0 + math.floor(code / 0x1000),
              0x80 + (math.floor(code / 0x40) % 0x40),
              0x80 + (code % 0x40)
            )
          end
          index = index + 6
        else
          error("无效的转义字符: " .. esc)
        end
      else
        parts[#parts + 1] = char
        index = index + 1
      end
    end
  end

  local function parse_number()
    local start_index = index
    while input:sub(index, index):match("[%d%+%-%.eE]") do
      index = index + 1
    end
    local value = tonumber(input:sub(start_index, index - 1))
    if value == nil then
      error("无效的 JSON 数字")
    end
    return value
  end

  local function parse_array()
    index = index + 1
    local result = {}
    skip_whitespace()
    if input:sub(index, index) == "]" then
      index = index + 1
      return result
    end
    while true do
      result[#result + 1] = parse_value()
      skip_whitespace()
      local char = input:sub(index, index)
      if char == "]" then
        index = index + 1
        return result
      end
      if char ~= "," then
        error("JSON 数组缺少分隔符")
      end
      index = index + 1
      skip_whitespace()
    end
  end

  local function parse_object()
    index = index + 1
    local result = {}
    skip_whitespace()
    if input:sub(index, index) == "}" then
      index = index + 1
      return result
    end
    while true do
      if input:sub(index, index) ~= '"' then
        error("JSON 对象键必须是字符串")
      end
      local key = parse_string()
      skip_whitespace()
      if input:sub(index, index) ~= ":" then
        error("JSON 对象缺少冒号")
      end
      index = index + 1
      skip_whitespace()
      result[key] = parse_value()
      skip_whitespace()
      local char = input:sub(index, index)
      if char == "}" then
        index = index + 1
        return result
      end
      if char ~= "," then
        error("JSON 对象缺少分隔符")
      end
      index = index + 1
      skip_whitespace()
    end
  end

  function parse_value()
    skip_whitespace()
    local char = input:sub(index, index)
    if char == '"' then
      return parse_string()
    end
    if char == "{" then
      return parse_object()
    end
    if char == "[" then
      return parse_array()
    end
    if char == "-" or char:match("%d") then
      return parse_number()
    end
    if input:sub(index, index + 3) == "true" then
      index = index + 4
      return true
    end
    if input:sub(index, index + 4) == "false" then
      index = index + 5
      return false
    end
    if input:sub(index, index + 3) == "null" then
      index = index + 4
      return nil
    end
    error("无效的 JSON 值")
  end

  return function()
    local result = parse_value()
    skip_whitespace()
    if index <= #input then
      error("JSON 末尾存在多余内容")
    end
    return result
  end
end

function json.decode(input)
  return create_decoder(input)()
end

return json
