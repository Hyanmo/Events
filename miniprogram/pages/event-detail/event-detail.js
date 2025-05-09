Page({
  data: {
    event: {},
    ticketInfo: ''
  },

  onLoad(options) {
    const eventId = options.id;
    console.log("Navigated to event ID:", eventId);

    wx.cloud.callFunction({
      name: "getEventDetail",
      data: { id: eventId },
      success: res => {
        console.log("Cloud function response:", res.result);
        if (res.result && !res.result.error) {
          const ticketInfo = this.formatTicketInfo(res.result);
          this.setData({ 
            event: res.result,
            ticketInfo: ticketInfo
          });
        } else {
          wx.showToast({
            title: "活动详情未找到",
            icon: "none"
          });
        }
      },
      fail: err => {
        console.error("Call function failed:", err);
      }
    });
  },

  formatTicketInfo(event) {
    const ticketStatus = event.ticketStatus || '未开票';
    const ticketTime = event.ticketTime || '待定';
    const platform = event.platform || '待定';
    const price = event.price || '待定';
    const ticketLink = event.ticketLink || '';

    return `开票状态：${ticketStatus}\n开票时间：${ticketTime}\n售票平台：${platform}\n票价：${price}${ticketLink ? '\n购票链接：' + ticketLink : ''}`;
  },

  previewImage() {
    wx.previewImage({
      urls: [this.data.event.cover],
      current: this.data.event.cover
    });
  },
  // 导航到活动地点
  openLocation() {
    if (!this.data.event.location) {
      wx.showToast({
        title: '位置信息不存在',
        icon: 'none'
      });
      return;
    }

    // 直接打开地图选择器
    wx.openLocation({
      latitude: this.data.event.latitude || 0,
      longitude: this.data.event.longitude || 0,
      name: this.data.event.location,
      address: this.data.event.location,
      scale: 18
    });
  },
  goHome() {
    wx.navigateTo({
      url: "/pages/index/index"
    });
  },
  
  goToTicket() {
    if (this.data.event.ticketLink) {
      wx.setClipboardData({
        data: this.data.event.ticketLink,
        success: () => {
          wx.showModal({
            title: '提示',
            content: '购票链接已复制到剪贴板，请在浏览器中打开',
            showCancel: false
          });
        }
      });
    }
  }
});
