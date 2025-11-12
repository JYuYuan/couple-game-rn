#!/bin/bash
set -e

echo "========================================"
echo "Fixing Assets Path (Rename node_modules to modules)"
echo "========================================"

DIST_DIR="dist"
ASSETS_DIR="$DIST_DIR/assets"
NODE_MODULES_DIR="$ASSETS_DIR/node_modules"
MODULES_DIR="$ASSETS_DIR/modules"

# 检查 dist 目录是否存在
if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Error: dist directory not found!"
  exit 1
fi

# 重命名 node_modules 为 modules
if [ -d "$NODE_MODULES_DIR" ]; then
  echo "📦 Renaming node_modules to modules..."
  mv "$NODE_MODULES_DIR" "$MODULES_DIR"
  echo "✅ Renamed: $NODE_MODULES_DIR -> $MODULES_DIR"
else
  echo "⚠️  No node_modules directory found in assets"
fi

# 更新 HTML 文件中的引用路径
echo "🔄 Updating references in HTML files..."

HTML_FILES=$(find "$DIST_DIR" -name "*.html" -type f)

if [ -n "$HTML_FILES" ]; then
  echo "$HTML_FILES" | while read -r html_file; do
    if [ -f "$html_file" ]; then
      # 替换路径：/assets/node_modules/ -> /assets/modules/
      sed -i.bak -E 's|/assets/node_modules/|/assets/modules/|g' "$html_file"

      # 删除备份文件
      rm -f "$html_file.bak"

      echo "  ✓ Updated: $(basename $html_file)"
    fi
  done
  echo "✅ Updated HTML files"
else
  echo "⚠️  No HTML files found"
fi

# 更新 CSS 文件中的引用路径
echo "🔄 Updating references in CSS files..."

CSS_FILES=$(find "$DIST_DIR" -name "*.css" -type f)

if [ -n "$CSS_FILES" ]; then
  echo "$CSS_FILES" | while read -r css_file; do
    if [ -f "$css_file" ]; then
      # 替换路径：/assets/node_modules/ -> /assets/modules/
      sed -i.bak -E 's|/assets/node_modules/|/assets/modules/|g' "$css_file"

      # 删除备份文件
      rm -f "$css_file.bak"

      echo "  ✓ Updated: $(basename $css_file)"
    fi
  done
  echo "✅ Updated CSS files"
else
  echo "⚠️  No CSS files found"
fi

# 更新 JS 文件中的引用路径
echo "🔄 Updating references in JS files..."

JS_FILES=$(find "$DIST_DIR" -name "*.js" -type f)

if [ -n "$JS_FILES" ]; then
  echo "$JS_FILES" | while read -r js_file; do
    if [ -f "$js_file" ]; then
      # 替换路径：/assets/node_modules/ -> /assets/modules/
      sed -i.bak -E 's|/assets/node_modules/|/assets/modules/|g' "$js_file"

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