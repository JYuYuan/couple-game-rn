# 使用官方 Node.js 运行时作为父镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3001

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 启动应用
CMD ["npm", "start"]
