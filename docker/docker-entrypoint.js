#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// 合并环境变量配置到 config.json
console.log("---- process.env 合并到 config.json 开始 ----");
const sampleConfPath = path.join(__dirname, "../sample_conf/config.json");
const confPath = path.join(__dirname, "../conf/config.json");
const cronicleConfig = getCronicleConfig(process.env);
mergeConfigFile(sampleConfPath, confPath, cronicleConfig);
console.log("---- process.env 合并到 config.json 结束 ----");

if (fs.existsSync("./data/users") || process.env["IS_WORKER"] === "true") {
  console.log("Docker Env already configured.");
  require("../lib/main.js");
} else {
  const { spawnSync } = require("child_process");
  const { hostname, networkInterfaces } = require("os");
  const StandaloneStorage = require("pixl-server-storage/standalone");
  if (fs.existsSync("./logs/cronicled.pid")) {
    fs.unlinkSync("./logs/cronicled.pid");
  }

  if (!fs.existsSync("./data/users")) {
    console.log("Storage init.");
    const result = spawnSync("/opt/cronicle/bin/control.sh", ["setup"]);
    if (result.error || result.stderr.length !== 0) {
      console.log("init strorage failed");
      console.log(result.error?.message || result.stderr.toString());
      process.exit(1);
    }
    console.log(`stdout: ${result.stdout}`);
  }

  process.chdir(path.dirname(__dirname));

  const config = require("../conf/config.json");
  const storage = new StandaloneStorage(config.Storage, function (err) {
    if (err) throw err;
    const dockerHostName = (
      process.env["HOSTNAME"] ||
      process.env["HOST"] ||
      hostname()
    ).toLowerCase();

    const networks = networkInterfaces();
    const [ip] = Object.keys(networks)
      .filter(
        (eth) =>
          networks[eth].filter(
            (addr) => addr.internal === false && addr.family === "IPv4"
          ).length
      )
      .map((eth) => networks[eth])[0];

    const data = {
      type: "list_page",
      items: [{ hostname: dockerHostName, ip: ip.address }],
    };

    const key = "global/servers/0";
    storage.put(key, data, function () {
      storage.shutdown(function () {
        console.log("Record successfully saved: " + key + "\n");
        storage.get(key, function (_, data) {
          if (storage.isBinaryKey(key)) {
            console.log(data.toString() + "\n");
          } else {
            console.log(
              (typeof data == "object"
                ? JSON.stringify(data, null, "\t")
                : data) + "\n"
            );
          }
          storage.shutdown(function () {
            console.log("Docker Env Fixed.");
            require("../lib/main.js");
          });
        });
      });
    });
  });
}

/**
 * 从指定环境变量对象中提取所有以 CONF_CRONICLE_ 开头的键。
 * 去掉前缀后，尝试将值解析为 JSON。
 * 如果解析失败，则保留原始字符串。
 *
 * @param {Record<string, string>} envObj - 环境变量对象（可传入 process.env）
 * @returns {Record<string, any>} - 最终解析后的配置对象
 */
function getCronicleConfig(envObj) {
  const prefix = "CONF_CRONICLE_";
  const result = {};

  // 遍历传入的环境变量对象
  for (const [key, value] of Object.entries(envObj)) {
    // 只处理指定前缀的变量
    if (key.startsWith(prefix)) {
      const shortKey = key.slice(prefix.length); // 去掉前缀
      let parsedValue;

      try {
        // 尝试解析 JSON（比如对象、数组、布尔值、数字）
        parsedValue = JSON.parse(value);
      } catch {
        // 不是合法 JSON 时保留原字符串
        parsedValue = value;
      }

      // 存入结果对象
      result[shortKey] = parsedValue;
    }
  }

  return result;
}

/**
 * 读取指定路径的 JSON 文件，和传入的对象合并后写回文件。
 *
 * @param {string} filePath - JSON 文件路径
 * @param {string} distPath - 目标 JSON 文件路径
 * @param {object} newData - 要合并的对象（例如 getCronicleConfig 的返回值）
 */
function mergeConfigFile(filePath, distPath, newData) {
  let originalData = {};

  try {
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      originalData = JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`⚠️ 读取或解析 JSON 文件失败：${filePath}`, err);
  }

  // 合并对象（浅合并，可改成深合并）
  const merged = { ...originalData, ...newData };

  // 写回文件（格式化缩进 2 个空格）
  try {
    fs.writeFileSync(distPath, JSON.stringify(merged, null, 2), "utf8");
    console.log(`✅ 配置文件已更新: ${path.resolve(distPath)}`);
  } catch (err) {
    console.error(`❌ 写入 JSON 文件失败：${distPath}`, err);
  }
}
