Page({
  data: {
    events: {},
    sortedKeys: [],
    checkedEvents: {},
    currentPage: 0,
    hasMore: true,
    isLoading: false,
    tmplId: 'dyDyxiUsleyC4do5XtSTrrrM6crE7sm0FwOFl6UXaKM' // 替换为您的订阅消息模板ID
  },

  onLoad() {
    this.fetchEvents()
    const checkedEvents = wx.getStorageSync('checkedEvents') || {}
    this.setData({ checkedEvents })
  },

  async fetchEvents(loadMore = false) {
    if (this.data.isLoading || (!loadMore && !this.data.hasMore)) return

    this.setData({ isLoading: true })

    wx.cloud.callFunction({
      name: 'getEvents',
      data: {
        skip: this.data.currentPage * 15
      },
      success: res => {
        if (res.result.success) {
          const rawEvents = res.result.data
          let groupedEvents = { ...this.data.events }

          // 重新整理数据，按照 YYYY-MM 分组
          rawEvents.forEach(event => {
            const [year, month] = event.date.split('-').slice(0, 2)
            const key = `${year}-${month}`

            // 添加是否可以设置提醒的标志
            if (event.ticketTime) {
              event.canSetReminder = new Date(event.ticketTime) > new Date()
            } else {
              event.canSetReminder = false
            }

            if (!groupedEvents[key]) {
              groupedEvents[key] = { year, month, items: [] }
            }
            groupedEvents[key].items.push(event)
          })

          // 按年月排序
          const sortedKeys = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a))

          this.setData({ 
            events: groupedEvents, 
            sortedKeys,
            currentPage: this.data.currentPage + 1,
            hasMore: res.result.hasMore
          })
        } else {
          console.error('获取数据失败', res.result.error)
        }
      },
      fail: err => {
        console.error('调用云函数失败', err)
      },
      complete: () => {
        this.setData({ isLoading: false })
        wx.stopPullDownRefresh()
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      events: {},
      sortedKeys: [],
      currentPage: 0,
      hasMore: true
    }, () => {
      this.fetchEvents()
    })
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.fetchEvents(true)
    }
  },

  // 切换事件勾选状态
  toggleEventCheck(e) {
    const eventId = e.currentTarget.dataset.id
    const checkedEvents = { ...this.data.checkedEvents }
    
    // Find event in the current data
    let event = null
    for (const key of this.data.sortedKeys) {
      const foundEvent = this.data.events[key].items.find(item => item._id === eventId)
      if (foundEvent) {
        event = foundEvent
        break
      }
    }
    
    if (!event) {
      wx.showToast({
        title: '未找到活动',
        icon: 'none'
      })
      return false
    }
    
    if (checkedEvents[eventId]) {
      delete checkedEvents[eventId]
      this.setData({ checkedEvents })
      wx.setStorageSync('checkedEvents', checkedEvents)
      wx.showToast({
        title: '已取消提醒',
        icon: 'success'
      })
      return false
    }

    // 请求订阅消息授权
    wx.requestSubscribeMessage({
      tmplIds: [this.data.tmplId],
      success: (res) => {
        if (res[this.data.tmplId] === 'accept') {
          wx.cloud.callFunction({
            name: 'setTicketReminder',
            data: {
              eventId,
              eventTitle: event.title,
              eventTime: event.date + ' ' + event.time,
              ticketTime: event.ticketTime,
              platform: event.platform || '待定',
              tips: '请准时参与抢票',
              reminderType: event.ticketTime ? 'fixed' : 'waiting',
              advanceMinutes: 15
            }
          }).then(res => {
            if (res.result.success) {
              wx.showModal({
                title: '设置提醒',
                content: res.result.message,
                showCancel: false,
                success: () => {
                  // 只在成功时勾选，不需要其他判断
                  checkedEvents[eventId] = true
                  this.setData({ checkedEvents })
                  wx.setStorageSync('checkedEvents', checkedEvents)
                }
              })
            } else {
              wx.showModal({
                title: '设置失败',
                content: res.result.error || '设置提醒失败，请稍后重试',
                showCancel: false
              })
            }
          }).catch(err => {
            wx.showModal({
              title: '设置失败',
              content: '网络错误，请稍后重试',
              showCancel: false
            })
          })
        } else if (res[this.data.tmplId] === 'reject') {
          wx.showModal({
            title: '提示',
            content: '您需要允许订阅消息才能设置开票提醒',
            showCancel: false
          })
        }
      },
      fail: () => {
        wx.showModal({
          title: '提示',
          content: '订阅消息授权失败，请稍后重试',
          showCancel: false
        })
      }
    })

    return false
  },

  // 修改现有的跳转函数，防止勾选时触发跳转
  goToEventsDetail(e) {
    // 如果是来自勾选按钮的点击，不执行跳转
    if (e.target.dataset.checkButton) {
      return
    }
    const eventId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/event-detail/event-detail?id=${eventId}`
    })
  }
})
