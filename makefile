ESP := espruino -j espruino.job.json

watch: build-w

all: build deploy

build: clean compile prepare
	$(ESP) build/main.js -o build.js

build-w: clean compile prepare
	$(ESP) build/main.js -w

deploy:
	$(ESP) build.js

clean:
	rimraf build

ide:
	$(ESP) --ide

compile:
	tsc

prepare:
	node scripts/prepare-for-espruino.js

deps:
	npm install -g espruino
