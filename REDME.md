# Polygon Edge init and run

This is the same what in [Polygon Edge Tutorial](https://edge-docs.polygon.technology/docs/get-started/set-up-ibft-locally)

## Prerequesites

- docker-compose
- nodejs
- `npm install` (as we need one package to run the script)

> In case someone wants to rebuild it to `bash`, the code is yours :)

## Build

This command will build test chains, generate configs and place them together.

```sh
npm run build
```

## Start

To start the blockchain, just trigger

```sh
npm start
```

As we have `&& docker-compose down` as a part of command, it should cleanup doker container after all. But, in case `docker-compose` failed while existing, we have to trigger the next command ourselves to cleanup:

```sh
docker-compose down
```
