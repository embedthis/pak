compile: 
	ejsc --out modules/sample.mod src/*.es

all: compile build install

build:
	../../jem create

install:
	cp sample.jem ../../local
