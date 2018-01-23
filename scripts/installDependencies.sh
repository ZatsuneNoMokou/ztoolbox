#!/usr/bin/env bash

cssLib='./webextension/data/css/lib'
jsLib='./webextension/data/js/lib'

echo Copying mustache...
cp ./node_modules/mustache/mustache.min.js $jsLib

echo Copying perfect-scrollbar...
cp ./node_modules/perfect-scrollbar/css/perfect-scrollbar.css $cssLib
cp ./node_modules/perfect-scrollbar/dist/perfect-scrollbar.min.js $jsLib

echo Copying webextension-polyfill...
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js $jsLib
cp ./node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map $jsLib

echo Copying/Building Lodash Debounce - Custom Build # https://lodash.com/custom-builds
lodash exports=global include=debounce --production --source-map
mv lodash.custom.min.js $jsLib
mv lodash.custom.min.map $jsLib

echo Copying i18next...
cp ./node_modules/i18next/i18next.min.js $jsLib

echo Copying i18next-xhr-backend...
cp ./node_modules/i18next-xhr-backend/i18nextXHRBackend.min.js $jsLib

#echo Downloading Tooltip...
#curl -L -# -o master.zip https://github.com/matthias-schuetz/Tooltip/archive/master.zip
#echo Copying Tooltip...
#mkdir tmp
#unzip -qq master.zip -d tmp
#rm master.zip
#cp ./tmp/Tooltip-master/css/tooltip.css $cssLib
#cp ./tmp/Tooltip-master/js/Tooltip.js $jsLib
#rm -R tmp

echo Downloading/Copying dom-delegate...
curl -L -# -o $jsLib/dom-delegate.min.js http://wzrd.in/standalone/dom-delegate@latest

echo Copying Moment.js...
cp ./node_modules/moment/moment.js $jsLib
cp ./node_modules/moment/locale/fr.js $jsLib/moment-locale-fr.js
