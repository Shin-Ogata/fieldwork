#!/usr/bin/env pwsh

if ($ENV:SHELL_ENV) {
  exit 0
}
$ENV:SHELL_ENV="true"

$BIN_DIR=Split-Path $MyInvocation.MyCommand.Definition -Parent
$ROOT_DIR=Split-Path $BIN_DIR -Parent
$ENV:Path="$ROOT_DIR/node_modules/.bin;" + $ENV:Path
$ENV:NO_UPDATE_NOTIFIER="true"
