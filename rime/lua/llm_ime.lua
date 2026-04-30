local config = require("llm_ime_config")
local fetch_text = require("fetch_text")
local json = require("json")

math.randomseed(os.time())

local function make_headers()
  local headers = {
    ["Content-Type"] = "application/json",
  }
  if config.shared_secret and config.shared_secret ~= "" then
    headers["Authorization"] = "Bearer " .. config.shared_secret
  end
  return headers
end

local function call_json(path, payload)
  local code, body = fetch_text(config.base_url .. path, {
    method = "POST",
    headers = make_headers(),
    source = json.encode(payload),
    connect_timeout = config.connect_timeout_seconds,
    timeout = config.request_timeout_seconds,
  })
  if code == nil then
    return nil, body or "请求失败"
  end
  if code ~= 200 then
    return nil, body or ("HTTP " .. tostring(code))
  end
  local ok, parsed = pcall(json.decode, body)
  if not ok then
    return nil, parsed
  end
  return parsed
end

local function ensure_session(env)
  if env.session_id and env.session_id ~= "" then
    return env.session_id
  end
  local reply, err = call_json("/api/ime/session", {})
  if not reply then
    return nil, err
  end
  env.session_id = reply.sessionId
  return env.session_id
end

local function commit_text(env, text, is_new, should_update)
  if not text or text == "" then
    return true
  end
  local session_id, session_err = ensure_session(env)
  if not session_id then
    return nil, session_err
  end
  local _, err = call_json("/api/ime/commit", {
    sessionId = session_id,
    text = text,
    new = is_new,
    update = should_update,
  })
  if err then
    return nil, err
  end
  return true
end

local function reset_session(env)
  env.last_prefix = ""
  if not env.session_id or env.session_id == "" then
    return
  end
  call_json("/api/ime/reset", {
    sessionId = env.session_id,
  })
end

local translator = {}

function translator.init(env)
  env.session_id = ""
  env.last_prefix = ""
  env.commit_notifier = env.engine.context.commit_notifier:connect(function(ctx)
    local commit = ctx.commit_history:back()
    if commit then
      commit_text(env, commit.text, true, true)
    end
    env.last_prefix = ""
  end)
  env.reset_notifier = env.engine.context.session_reset_notifier:connect(function()
    reset_session(env)
  end)
end

function translator.fini(env)
  if env.commit_notifier then
    env.commit_notifier:disconnect()
  end
  if env.reset_notifier then
    env.reset_notifier:disconnect()
  end
  env.commit_notifier = nil
  env.reset_notifier = nil
  env.session_id = ""
  env.last_prefix = ""
  collectgarbage()
end

function translator.func(input, seg, env)
  if input == "" then
    env.last_prefix = ""
    return
  end

  local session_id, session_err = ensure_session(env)
  if not session_id then
    return
  end

  local ctx = env.engine.context
  local preedit = ctx:get_preedit().text or ""
  if preedit ~= "" then
    local selected_prefix = string.sub(
      preedit,
      1,
      math.max(0, string.len(preedit) - (seg._end - seg.start))
    )
    if selected_prefix ~= "" and selected_prefix ~= env.last_prefix then
      commit_text(env, selected_prefix, false, true)
      env.last_prefix = selected_prefix
    elseif selected_prefix == "" then
      env.last_prefix = ""
    end
  else
    env.last_prefix = ""
  end

  local reply = call_json("/api/ime/candidates", {
    sessionId = session_id,
    keys = input,
  })
  if not reply or type(reply.candidates) ~= "table" then
    return
  end

  for _, item in ipairs(reply.candidates) do
    local word = item.word or ""
    if word ~= "" then
      local candidate = Candidate(
        "llm_ime",
        seg.start,
        seg.start + (item.consumedkeys or string.len(input)),
        word,
        item.preedit or ""
      )
      candidate.quality = 2
      yield(candidate)
    end
  end
end

return { translator = translator }
