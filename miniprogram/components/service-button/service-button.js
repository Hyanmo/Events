Component({
  data: {
    isExpanded: false,
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
      }
    ]
  },

  methods: {
    toggleExpand() {
      this.setData({
        isExpanded: !this.data.isExpanded
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