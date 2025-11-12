#!/bin/bash
set -e

echo "========================================"
echo "Fixing Assets Path (Moving fonts from node_modules)"
echo "========================================"

DIST_DIR="dist"
ASSETS_DIR="$DIST_DIR/assets"
FONTS_TARGET_DIR="$ASSETS_DIR/fonts"

# 检查 dist 目录是否存在
if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Error: dist directory not found!"
  exit 1
fi

# 创建 fonts 目标目录
mkdir -p "$FONTS_TARGET_DIR"
echo "✅ Created fonts directory: $FONTS_TARGET_DIR"

# 查找所有字体文件并移动到统一的 fonts 目录
echo "📦 Moving font files..."

# 查找 node_modules 中的所有字体文件
FONT_FILES=$(find "$ASSETS_DIR" -path "*/node_modules/*" -type f \( -name "*.ttf" -o -name "*.otf" -o -name "*.woff" -o -name "*.woff2" \) 2>/dev/null || true)

if [ -z "$FONT_FILES" ]; then
  echo "⚠️  No font files found in node_modules"
else
  echo "$FONT_FILES" | while read -r font_file; do
    if [ -f "$font_file" ]; then
      # 获取文件名
      filename=$(basename "$font_file")

      # 复制到新位置
      cp "$font_file" "$FONTS_TARGET_DIR/$filename"
      echo "  ✓ Copied: $filename"
    fi
  done

  echo "✅ All fonts copied to: $FONTS_TARGET_DIR"
fi

# 删除 assets/node_modules 目录（可选）
if [ -d "$ASSETS_DIR/node_modules" ]; then
  echo "🗑️  Removing assets/node_modules directory..."
  rm -rf "$ASSETS_DIR/node_modules"
  echo "✅ Removed assets/node_modules"
fi

# 更新 HTML 文件中的字体引用路径
echo "🔄 Updating font references in HTML files..."

# 查找所有 HTML 文件
HTML_FILES=$(find "$DIST_DIR" -name "*.html" -type f)

if [ -n "$HTML_FILES" ]; then
  echo "$HTML_FILES" | while read -r html_file; do
    if [ -f "$html_file" ]; then
      # 替换字体路径：/assets/node_modules/@expo/vector-icons/.../Fonts/FontName.hash.ttf -> /assets/fonts/FontName.hash.ttf
      sed -i.bak -E 's|/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/([^"'\'']+)|/assets/fonts/\1|g' "$html_file"

      # 删除备份文件
      rm -f "$html_file.bak"

      echo "  ✓ Updated: $(basename $html_file)"
    fi
  done
  echo "✅ Updated HTML files"
else
  echo "⚠️  No HTML files found"
fi

# 更新 CSS 文件中的字体引用路径
echo "🔄 Updating font references in CSS files..."

CSS_FILES=$(find "$DIST_DIR" -name "*.css" -type f)

if [ -n "$CSS_FILES" ]; then
  echo "$CSS_FILES" | while read -r css_file; do
    if [ -f "$css_file" ]; then
      # 替换字体路径
      sed -i.bak -E 's|/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/([^")]+)|/assets/fonts/\1|g' "$css_file"

      # 删除备份文件
      rm -f "$css_file.bak"

      echo "  ✓ Updated: $(basename $css_file)"
    fi
  done
  echo "✅ Updated CSS files"
else
  echo "⚠️  No CSS files found"
fi

# 更新 JS 文件中的字体引用路径
echo "🔄 Updating font references in JS files..."

JS_FILES=$(find "$DIST_DIR" -name "*.js" -type f)

if [ -n "$JS_FILES" ]; then
  echo "$JS_FILES" | while read -r js_file; do
    if [ -f "$js_file" ]; then
      # 替换字体路径
      sed -i.bak -E 's|/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/([^"'\'']+)|/assets/fonts/\1|g' "$js_file"

      # 删除备份文件
      rm -f "$js_file.bak"

      echo "  ✓ Updated: $(basename $js_file)"
    fi
  done
  echo "✅ Updated JS files"
else
  echo "⚠️  No JS files found"
fi

echo "========================================"
echo "✨ Assets path fixed successfully!"
echo "========================================"
