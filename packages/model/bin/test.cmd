@echo off
mocha -r ts-node/register src/tests/%~1.spec.ts