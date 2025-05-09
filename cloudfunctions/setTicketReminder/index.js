const cloud = require('wx-server-sdk')
cloud.init({
  env: 'yanmo-3g8s1hmd1faa3280'  // 替换为你的环境ID
})

exports.main = async (event, context) => {
  const { 
    eventId, 
    eventTitle, 
    eventTime, 
    ticketTime, 
    platform, 
    tips,
    reminderType,
    advanceMinutes = 15
  } = event
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  try {
    if (reminderType === 'waiting') {
      return { 
        success: false,
        message: '开票时间暂未确定，请等待开票时间公布后再设置提醒'
      }
    }

    if (!ticketTime) {
      return {
        success: false,
        error: '请设置开票时间'
      }
    }

    // 计算实际提醒时间
    const ticketDateTime = new Date(ticketTime)
    console.log('开票时间:', ticketDateTime.toLocaleString('en-US', { hour12: true }))
    
    const reminderTimestamp = ticketDateTime.getTime() - (advanceMinutes * 60 * 1000)
    const reminderDateTime = new Date(reminderTimestamp)
    
    // 格式化提醒时间为查询匹配格式
    const formattedReminderTime = reminderDateTime.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    console.log('提醒时间:', formattedReminderTime)

    const reminderData = {
      userId: wxContext.OPENID,
      eventId,
      eventTitle,
      eventTime,
      ticketTime,
      platform,
      tips,
      advanceMinutes,
      reminderTime: formattedReminderTime,  // 存储格式化后的时间字符串
      status: 'pending',
      createdAt: db.serverDate(),
      lastUpdated: db.serverDate()
    }

    // 检查提醒时间是否已过
    if (reminderDateTime < new Date()) {
      const ticketDateStr = ticketDateTime.toLocaleString();
      return {
        success: false,
        error: `该活动开票时间(${ticketDateStr})已过，无法设置提醒`
      }
    }

    // 检查当前时间是否已超过开票时间
    const now = new Date()

    if (ticketDateTime.getTime() < now.getTime()) {
      return {
        success: false,
        error: `该活动开票时间(${formattedTicketTime})已过，无法设置提醒`
      }
    }

    // 检查是否已超过提醒时间但未超过开票时间
    if (reminderDateTime.getTime() < now.getTime() && now.getTime() < ticketDateTime.getTime()) {
      return {
        success: false,
        error: '距离开票时间太近，无法设置提醒'
      }
    }

    await db.collection('ticketReminders').add({
      data: reminderData
    })

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
    
    await sendReminderMessage(wxContext.OPENID, {
      eventTitle,
      eventTime: formatTimeForMessage(eventTime),
      ticketTime: formatTimeForMessage(ticketTime),
      platform,
      tips: `将在开票前${advanceMinutes}分钟提醒您`
    })

    return { 
      success: true,
      message: `提醒设置成功，将在 ${formattedReminderTime} 提醒您`
    }
  } catch (error) {
    console.error(error)
    return { success: false, error: error.message }
  }
}

// 发送提醒消息
async function sendReminderMessage(openid, data) {
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: 'dyDyxiUsleyC4do5XtSTrrrM6crE7sm0FwOFl6UXaKM',
      data: {
        thing1: { value: data.eventTitle.substring(0, 20) },
        time2: { value: data.eventTime },  // 现在使用格式化后的时间
        time3: { value: data.ticketTime }, // 现在使用格式化后的时间
        thing4: { value: data.platform.substring(0, 20) },
        thing5: { value: data.tips }
      }
    })
    return true
  } catch (error) {
    console.error('发送提醒消息失败：', error)
    return false
  }
}