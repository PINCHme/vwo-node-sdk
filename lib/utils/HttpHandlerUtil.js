/**
 * Copyright 2019-2022 Wingify Software Pvt. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const https = require('https');

const DataTypeUtil = require('./DataTypeUtil');
const Constants = require('../constants');
const logging = require('../services/logging');
const FileNameEnum = require('../enums/FileNameEnum');
const { LogLevelEnum, LogMessageEnum, LogMessageUtil } = logging;
const logger = logging.getLogger();

const HttpHandlerUtil = {
  sendGetCall: function(url, queryParams, authToken, callback, customHeaders = {}) {
    let endPoint = `${url.protocol === 'http' ? 'http' : 'https'}://${url.host}${url.path}`;
    const options = {
      hostname: url.host,
      path: url.path + queryParams,
      agent: false // Create a new agent just for this one request
    };

    if (url.port) {
      options.port = url.port;
    }
    options.headers = customHeaders;
    if (authToken) {
      options.headers['Authorization'] = authToken;
    }

    https.get(options, res => {
      let rawData = ''; // eslint-disable-line no-unused-vars

      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        rawData += chunk;
      });
      res.on('end', function() {
        if (callback && DataTypeUtil.isFunction(callback)) {
          try {
            callback(null, { endPoint, rawData: JSON.parse(rawData) });
          } catch (err) {
            const serverResponse = err + ', Server Response -- ' + rawData;
            logger.log(
              LogLevelEnum.ERROR,
              LogMessageUtil.build(LogMessageEnum.ERROR_MESSAGES.IMPRESSION_FAILED, {
                file: FileNameEnum.EventDispatcher,
                endPoint,
                err: serverResponse
              })
            );
          }
        }
      });
      res.on('error', function(err) {
        callback(err, { endPoint });
      });
    });
  },

  sendPostCall: function(url, postData, queryParams, authToken, callback, customHeaders = {}) {
    postData = JSON.stringify(postData);
    customHeaders['Content-Length'] = postData.length;
    const options = {
      method: 'POST',
      hostname: url.host,
      path: queryParams ? url.path + queryParams : url.path,
      agent: false, // Create a new agent just for this one request
      headers: customHeaders
    };

    if (authToken) {
      options.headers.Authorization = authToken;
    } else {
      // what should be the user-agent here?
      options.headers['User-Agent'] = Constants.SDK_NAME;
    }

    if (url.port) {
      options.port = url.port;
    }

    const req = https.request(options, res => {
      let rawData = ''; // eslint-disable-line no-unused-vars
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        rawData += chunk;
      });
      res.on('end', function() {
        callback(null, res, rawData);
      });
    });

    req.on('error', e => {
      callback(e, null);
    });

    req.write(postData);
    req.end();
  }
};

module.exports = HttpHandlerUtil;
