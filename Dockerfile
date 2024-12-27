FROM node:23-alpine
RUN corepack enable
COPY . /panelbuild/
RUN rm -rf /panelbuild/Server/node_modules /panelbuild/Web/node_modules
WORKDIR /panelbuild/Server
ENV BURGERPANEL_DOCKER=1
RUN pnpm i
RUN pnpm buildRelease
FROM node:23-alpine
RUN apk update
RUN apk add openjdk21
WORKDIR /panel
COPY --from=0 /panelbuild/Server/node_modules/better-sqlite3/build/Release/better_sqlite3.node /panel/better_sqlite3.node
COPY --from=0 /panelbuild/Server/_build/ /panel
CMD [ "node", "burgerpanel.mjs" ]