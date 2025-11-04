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

// 导出方法以供其他模块使用
module.exports = { getCronicleConfig };
