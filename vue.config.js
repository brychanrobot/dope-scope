// Copyright 2020 Google LLC
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const fs = require("fs");
const os = require("os");

module.exports = {
  devServer: {
    https: {
      key: fs.readFileSync("./ssl/server.pem"),
      cert: fs.readFileSync("./ssl/server.crt")
    },
    disableHostCheck: true,
    public: `https://${os.hostname()}:8080/`
  },
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.firmware$/i,
          loader: "file-loader",
          options: {
            name: "[path][name].[ext]"
          }
        }
      ]
    }
  }
};
