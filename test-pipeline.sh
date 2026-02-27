#!/bin/bash
# UGC-AI Full Pipeline Test Script
# Tests: Auth → Content Generation → TTS → Video Render

BASE_URL="http://localhost:3000"
COOKIES="/tmp/ugc-test-cookies.txt"
PASS=0
FAIL=0

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; PASS=$((PASS+1)); }
red() { printf "\033[31m✗ %s\033[0m\n" "$1"; FAIL=$((FAIL+1)); }
bold() { printf "\033[1m%s\033[0m\n" "$1"; }

bold "═══════════════════════════════════════"
bold "  UGC-AI Pipeline Test"
bold "═══════════════════════════════════════"
echo ""

# ─── 1. Server Health ───
bold "1. Server Health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$STATUS" = "200" ]; then
  green "Landing page returns 200"
else
  red "Landing page returned $STATUS (expected 200)"
fi

# ─── 2. Authentication ───
bold "2. Authentication"
CSRF=$(curl -s -c "$COOKIES" "$BASE_URL/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null)
if [ -n "$CSRF" ]; then
  green "CSRF token obtained"
else
  red "Failed to get CSRF token"
  echo "Aborting - server may not be running"
  exit 1
fi

LOGIN_STATUS=$(curl -s -c "$COOKIES" -b "$COOKIES" -X POST \
  "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@test.com&password=password123&csrfToken=$CSRF" \
  -o /dev/null -w "%{http_code}")
if [ "$LOGIN_STATUS" = "302" ]; then
  green "Login successful (302 redirect)"
else
  red "Login returned $LOGIN_STATUS (expected 302)"
fi

# Verify session works
SESSION_STATUS=$(curl -s -b "$COOKIES" -o /dev/null -w "%{http_code}" "$BASE_URL/dashboard")
if [ "$SESSION_STATUS" = "200" ]; then
  green "Dashboard accessible with session"
else
  red "Dashboard returned $SESSION_STATUS (expected 200)"
fi

# ─── 3. Content Generation ───
bold "3. Content Generation (LLM)"
echo "   Generating UGC script... (may take 10-30s)"
GENERATE_RESP=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "GlowSkin Serum",
    "productDescription": "A vitamin C serum that brightens skin in 7 days",
    "targetAudience": "Women 18-35 into skincare",
    "platform": "tiktok",
    "contentGoal": "sales",
    "tone": "casual",
    "ctaType": "Link in Bio"
  }' --max-time 60)

if echo "$GENERATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('success')==True" 2>/dev/null; then
  green "Content generated successfully"
  CONTENT=$(echo "$GENERATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('output',''))[:120])" 2>/dev/null)
  echo "   Preview: $CONTENT..."
else
  red "Content generation failed"
  echo "   Response: $(echo "$GENERATE_RESP" | head -c 200)"
fi

# ─── 4. TTS Voiceover ───
bold "4. TTS Voiceover"
echo "   Generating voiceover..."
TTS_RESP=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/video/tts" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Stop scrolling. This vitamin C serum literally changed my skin in just one week. My dark spots? Gone. My glow? Unreal. You need to try this.",
    "voice": "jenny",
    "rate": "+0%"
  }' --max-time 30)

TTS_SUCCESS=$(echo "$TTS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',''))" 2>/dev/null)
if [ "$TTS_SUCCESS" = "True" ]; then
  green "TTS voiceover generated"
  AUDIO_URL=$(echo "$TTS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['audioUrl'])" 2>/dev/null)
  DURATION=$(echo "$TTS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['duration'])" 2>/dev/null)
  WORDS=$(echo "$TTS_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['wordBoundaries']))" 2>/dev/null)
  echo "   Audio: $AUDIO_URL"
  echo "   Duration: ${DURATION}ms | Words tracked: $WORDS"
else
  red "TTS generation failed"
  echo "   Response: $(echo "$TTS_RESP" | head -c 200)"
  AUDIO_URL=""
fi

# Verify audio file is accessible
if [ -n "$AUDIO_URL" ]; then
  AUDIO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$AUDIO_URL")
  if [ "$AUDIO_STATUS" = "200" ]; then
    green "Audio file accessible at $AUDIO_URL"
  else
    red "Audio file returned $AUDIO_STATUS"
  fi
fi

# ─── 5. Stock Footage Search ───
bold "5. Stock Footage Search"
FOOTAGE_RESP=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/video/footage" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "skincare serum",
    "productDescription": "vitamin C brightening serum",
    "platform": "tiktok",
    "type": "image"
  }' --max-time 15)

CLIPS_COUNT=$(echo "$FOOTAGE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('clips',[])))" 2>/dev/null)
if [ "$CLIPS_COUNT" -gt 0 ] 2>/dev/null; then
  green "Found $CLIPS_COUNT stock images"
else
  FOOTAGE_ERR=$(echo "$FOOTAGE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown'))" 2>/dev/null)
  if echo "$FOOTAGE_ERR" | grep -qi "pexels\|api key\|configured"; then
    echo "   ⚠ Pexels API key not set (optional - videos use gradient backgrounds)"
    green "Footage API responds correctly (needs API key)"
  else
    red "Footage search failed: $FOOTAGE_ERR"
  fi
fi

# ─── 6. Video Rendering ───
bold "6. Video Rendering (Remotion)"
echo "   Rendering 10s test video... (may take 30-90s)"

RENDER_RESP=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/video/render" \
  -H "Content-Type: application/json" \
  -d "{
    \"template\": \"CaptionStyle\",
    \"hook\": \"Stop scrolling!\",
    \"scriptLines\": [\"This serum changed my skin\", \"Dark spots gone in 7 days\", \"You NEED to try this\"],
    \"cta\": \"Link in Bio\",
    \"audioSrc\": \"$AUDIO_URL\",
    \"platform\": \"tiktok\",
    \"durationMs\": 10000,
    \"captionStyle\": \"karaoke\",
    \"hookStyle\": \"pop\",
    \"colorAccent\": \"#A855F7\"
  }" --max-time 180)

VIDEO_PATH=$(echo "$RENDER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('videoPath',''))" 2>/dev/null)
if [ -n "$VIDEO_PATH" ] && [ "$VIDEO_PATH" != "None" ]; then
  green "Video rendered successfully"
  echo "   Path: $VIDEO_PATH"

  # Check file size
  FULL_PATH="/Users/nsansi.s.n/Desktop/ugc-ai/public$VIDEO_PATH"
  if [ -f "$FULL_PATH" ]; then
    SIZE=$(ls -lh "$FULL_PATH" | awk '{print $5}')
    green "Video file exists ($SIZE)"
    echo "   View: $BASE_URL$VIDEO_PATH"
  else
    red "Video file not found at $FULL_PATH"
  fi

  # Check HTTP access
  VIDEO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$VIDEO_PATH")
  if [ "$VIDEO_STATUS" = "200" ]; then
    green "Video downloadable via HTTP"
  else
    red "Video HTTP access returned $VIDEO_STATUS"
  fi
else
  red "Video rendering failed"
  echo "   Response: $(echo "$RENDER_RESP" | head -c 300)"
fi

# ─── 7. Pages Load Test ───
bold "7. Page Load Tests"
for page in "/" "/login" "/dashboard" "/generate" "/video" "/saved" "/settings"; do
  STATUS=$(curl -s -b "$COOKIES" -o /dev/null -w "%{http_code}" -L "$BASE_URL$page")
  if [ "$STATUS" = "200" ]; then
    green "GET $page → 200"
  else
    red "GET $page → $STATUS"
  fi
done

# ─── Summary ───
echo ""
bold "═══════════════════════════════════════"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" = "0" ]; then
  printf "\033[32m  All %d tests passed!\033[0m\n" "$TOTAL"
else
  printf "  \033[32m%d passed\033[0m / \033[31m%d failed\033[0m out of %d\n" "$PASS" "$FAIL" "$TOTAL"
fi
bold "═══════════════════════════════════════"

# Cleanup
rm -f "$COOKIES"
