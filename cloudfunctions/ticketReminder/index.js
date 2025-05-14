const cloud = require('wx-server-sdk')

// 指定环境
cloud.init({
  env: 'yanmo-3g8s1hmd1faa3280'
})

// 设置时区为东八区
process.env.TZ = 'Asia/Shanghai'

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command
  const now = new Date()

  try {
    // 打印更详细的时间信息用于调试
    console.log('系统时间详情:', {
      ISO: now.toISOString(),
      Local: now.toString(),
      Unix: now.getTime(),
      Formatted: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    })

    // 限制每次处理的数量
    // 格式化时间为查询格式
    const startTime = new Date(now.getTime() - 300000).toLocaleString('en-US', {  // 5分钟 = 300000毫秒
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    let endTime = now.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    // 处理跨天的情况
    if (endTime.includes('12:') && endTime.includes('AM')) {
      // 如果是凌晨12点，将其修改为00:xx AM的格式
      endTime = endTime.replace('12:', '00:')
    }

    const reminders = await db.collection('ticketReminders')
      .where({
        reminderTime: _.and([
          _.gt(startTime),  // 5分钟前
          _.lte(endTime),   // 当前时间
          db.RegExp({
            regexp: `${endTime.includes('AM') ? 'AM' : 'PM'}$`,  // 确保只匹配相同时间段
          })
        ]),
        status: 'pending'
      })
      .limit(1000)
      .get()

    console.log('查询条件:', { startTime, endTime })
    console.log('当前时间:', now.toLocaleString())
    console.log('找到待提醒数量：', reminders.data.length)

    
    // 格式化时间为微信订阅消息要求的格式
    function formatTimeForMessage(timeStr) {
      console.log('原始时间字符串:', timeStr)
      
      // 如果是时间段格式，去掉后面的时间段
      if (/ \d{2}:\d{2}-\d{2}:\d{2}$/.test(timeStr)) {
        const result = timeStr.replace(/-\d{2}:\d{2}$/, '')
        console.log('时间段格式，处理后:', result)
        return result
      }
     
      // 处理普通时间格式
      return timeStr
    }
     

    // 批量发送提醒
    const promises = reminders.data.map(async (reminder) => {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: reminder.userId,
          templateId: 'dyDyxiUsleyC4do5XtSTrrrM6crE7sm0FwOFl6UXaKM',
          data: {
            thing1: { value: reminder.eventTitle.substring(0, 20) },
            time2: { value: formatTimeForMessage(reminder.eventTime) },
            time3: { value: formatTimeForMessage(reminder.ticketTime) },
            thing4: { value: reminder.platform.substring(0, 20) },
            thing5: { value: reminder.tips }  // Simplified message to fit length limit
          }
        })

        await db.collection('ticketReminders').doc(reminder._id).update({
          data: {
            status: 'sent',
            sentAt: db.serverDate()
          }
        })

        return { success: true, id: reminder._id }
      } catch (error) {
        console.error('发送提醒失败:', error.errMsg || error.message, {
          eventTitle: reminder.eventTitle,
          userId: reminder.userId
        })
        return { success: false, id: reminder._id, error: error.errMsg || error.message }
      }
    })

    const results = await Promise.all(promises)

    return {
      success: true,
      results,
      sentCount: results.filter(r => r.success).length
    }
  } catch (error) {
    console.error('执行失败：', error)
    return {
      success: false,
      error: error.message
    }
  }
}