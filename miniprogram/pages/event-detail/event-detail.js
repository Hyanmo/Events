Page({
  data: {
    event: {},
    loading: true,
    countdown: 0,
    countdownHours: 0,
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
          this.calculateCountdown();
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
  },

    calculateCountdown() {
        const event = this.data.event;
        if (!event.fulltime) return;
        
        console.log('原始活动时间:', event.fulltime);
        
        // 解析活动时间字符串
        const [datePart, timePart] = event.fulltime.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        
        console.log('解析后的日期:', year, month, day);
        
        // 获取东八区当前时间
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const nowCst = new Date(utc + (3600000 * 8));
        
        // 只比较日期部分
        const today = new Date(nowCst.getFullYear(), nowCst.getMonth(), nowCst.getDate());
        const eventDay = new Date(year, month - 1, day);
        
        // 如果活动日期已过，设置isExpired为true
        if (today > eventDay) {
            console.log('活动日期已过');
            this.setData({
                isExpired: true
            });
            return;
        }
        
        // 以下是原有的倒计时计算逻辑
        const eventDate = new Date();
        eventDate.setFullYear(year);
        eventDate.setMonth(month - 1);
        eventDate.setDate(day);
        
        if (timePart) {
            // 处理时间段格式（例如：14:00-19:00），只取开始时间
            const startTime = timePart ? timePart.split('-')[0].trim() : null;
            let hours = 0, minutes = 0;
            if (startTime && startTime.includes(':')) {
                [hours, minutes] = startTime.split(':').map(str => parseInt(str, 10));
            }
            console.log('解析后的时间:', hours, minutes);
            eventDate.setHours(hours, minutes, 0, 0);
        } else {
            eventDate.setHours(0, 0, 0, 0);
        }
        
        const eventTime = eventDate.getTime();
        const nowTime = nowCst.getTime();
        
        if (nowTime >= eventTime) {
            this.setData({
                countdown: 0,
                countdownHours: 0,
                countdownMinutes: 0
            });
            return;
        }
        
        const diffTime = eventTime - nowTime;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        
        console.log('计算结果 - 天数:', diffDays, '小时数:', diffHours, '分钟数:', diffMinutes);
    
        this.setData({
            countdown: diffDays,
            countdownHours: diffHours,
            countdownMinutes: diffMinutes,
            isExpired: false
        });
    },
  // 添加到日历功能
  addToCalendar() {
    const event = this.data.event;
    if (!event.fulltime) {
      wx.showToast({
        title: '活动时间不存在',
        icon: 'none'
      });
      return;
    }

    // 解析时间
    const eventDate = new Date(event.fulltime);
    const isAllDay = !event.fulltime.includes(':'); // 如果没有具体时间，则为全天事件

    // 准备日历数据
    const startTime = eventDate.getTime() / 1000; // 开始时间
    const endTime = isAllDay ?
        (eventDate.getTime() + 24 * 60 * 60 * 1000) / 1000 : // 全天事件结束时间为第二天
        (eventDate.getTime() + 2 * 60 * 60 * 1000) / 1000; // 非全天事件默认2小时

    // 直接调用添加日历API，这会自动触发授权弹窗
    wx.addPhoneCalendar({
      title: event.title, // 日程标题，必填项
      startTime: startTime, // 日程开始时间，必填项
      endTime: endTime, // 日程结束时间，必填项
      location: event.location || '', // 日程地点，非必填项
      description: event.description || '', // 日程备注，非必填项
      allDay: isAllDay, // 设置全天事件标志
      alarmOffset: 60*60*24, //提前一天提醒
      success: () => {
        wx.showToast({
          title: '已添加到日历',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('添加日历失败：', err);
        wx.showToast({
          title: '添加失败',
          icon: 'error'
        });
      }
    });
  }
});
