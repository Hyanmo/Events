const cloud = require('wx-server-sdk')
cloud.init({
  env: 'yanmo-3g8s1hmd1faa3280'
})

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const now = new Date()
  
  try {
    // 添加日志输出便于调试
    console.log('开始清理已发送的提醒...')

    const result = await db.collection('ticketReminders')
      .where({
        status: 'sent'  // 只清理已发送的提醒
      })
      .remove()

    console.log('清理结果:', {
      删除记录数: result.stats.removed,
      清理时间: now.toLocaleString('en-US', { hour12: true })
    })

    return {
      success: true,
      removedCount: result.stats.removed
    }
  } catch (error) {
    console.error('清理失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}