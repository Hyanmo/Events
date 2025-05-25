const cloud = require('wx-server-sdk')
cloud.init({
  env: 'yanmo-3g8s1hmd1faa3280'
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  try {
    await db.collection('scheduleSubscribers').add({
      data: {
        userId: wxContext.OPENID,
        createdAt: db.serverDate()
      }
    })

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}