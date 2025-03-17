Page({
  data: {
    events: {},
    sortedKeys: [],
    checkedEvents: {},
    currentPage: 0,
    hasMore: true,
    isLoading: false
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
    
    if (checkedEvents[eventId]) {
      delete checkedEvents[eventId]
    } else {
      checkedEvents[eventId] = true
    }

    this.setData({ checkedEvents })
    wx.setStorageSync('checkedEvents', checkedEvents)
  },

  // 修改现有的跳转函数，防止勾选时触发跳转
  goToEventsDetail(e) {
    // 如果是勾选按钮的点击，不执行跳转
    if (e.target.dataset.checkButton) {
      return
    }
    const eventId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/event-detail/event-detail?id=${eventId}`
    })
  }
})
