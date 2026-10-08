export default {
  pages: [
    'pages/query/index',
    'pages/loading/index',
    'pages/mine/index',
    'pages/results/index',
    'pages/detail/index',
    'pages/about/index',
    'pages/place-picker/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#1989fa',
    navigationBarTitleText: '懂行',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f7f8fa'
  },
  tabBar: {
    color: '#97a3a9',
    selectedColor: '#0e5a6b',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/query/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png'
      },
      {
        pagePath: 'pages/about/index',
        text: '关于',
        iconPath: 'assets/tab/about.png',
        selectedIconPath: 'assets/tab/about-active.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tab/mine.png',
        selectedIconPath: 'assets/tab/mine-active.png'
      }
    ]
  },
  permission: {
    'scope.userLocation': {
      desc: '用于快速填入你所在的城市'
    }
  },
  requiredPrivateInfos: ['getLocation']
};
