FROM node:18.1.0-alpine3.15

WORKDIR /opt/app

COPY . .
RUN npm install --only=prod

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG GITHUB_APIKEY
ENV GITHUB_APIKEY $GITHUB_APIKEY

ARG PORT=80
ENV PORT $PORT
EXPOSE $PORT

CMD [ "node", "src/index.js" ]