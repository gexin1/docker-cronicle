const fs = require("fs");
const path = require("path");

/**
 * 读取指定路径的 JSON 文件，和传入的对象合并后写回文件。
 *
 * @param {string} filePath - JSON 文件路径
 * @param {object} newData - 要合并的对象（例如 getCronicleConfig 的返回值）
 */
function mergeConfigFile(filePath, newData) {
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
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf8");
    console.log(`✅ 配置文件已更新: ${path.resolve(filePath)}`);
  } catch (err) {
    console.error(`❌ 写入 JSON 文件失败：${filePath}`, err);
  }
}

module.exports = { mergeConfigFile };
