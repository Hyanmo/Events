Component({
  data: {
    isExpanded: false,
    weeklyTmplId: '3n7W3wt4DqEPSrPLFff8aCwqpDLOs7BwCOxQptRsiAc', // 替换为您的订阅消息模板ID
    tools: [
      {
        icon: 'cloud://yanmo-3g8s1hmd1faa3280.7961-yanmo-3g8s1hmd1faa3280-1342521606/images/service.png',
        type: 'contact',
        name: '客服'
      },
      {
        icon: 'cloud://yanmo-3g8s1hmd1faa3280.7961-yanmo-3g8s1hmd1faa3280-1342521606/images/share.png',
        type: 'share',
        name: '分享小程序'
      },
      {
        icon: 'cloud://yanmo-3g8s1hmd1faa3280.7961-yanmo-3g8s1hmd1faa3280-1342521606/images/chat.png',
        type: 'subscribe',
        name: '订阅周报'
      }
    ]
  },

  methods: {
    toggleExpand() {
      this.setData({
        isExpanded: !this.data.isExpanded
      })
    },

    handleToolClick(e) {
      const tool = this.data.tools[e.currentTarget.dataset.index]
      if (tool.type === 'subscribe') {
        this.subscribeWeeklySchedule()
      }
    },

    subscribeWeeklySchedule() {
      wx.requestSubscribeMessage({
        tmplIds: [this.data.weeklyTmplId],
        success: (res) => {
          if (res[this.data.weeklyTmplId] === 'accept') {
            wx.cloud.callFunction({
              name: 'subscribeSchedule',
              success: () => {
                wx.showToast({
                  title: '订阅成功',
                  icon: 'success'
                })
              },
              fail: () => {
                wx.showToast({
                  title: '订阅失败',
                  icon: 'error'
                })
              }
            })
          }
        }
      })
    },

    onShareAppMessage() {
      return {
        title: '活动日程表',
        path: '/pages/index/index'
      }
    }
  }
})