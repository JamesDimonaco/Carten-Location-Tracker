FROM denoland/deno:2.3.1

WORKDIR /app

COPY . .

RUN deno cache main.ts

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"] 