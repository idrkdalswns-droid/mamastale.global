export const SERVICES = {
  main: {
    id: 'main',
    name: '엄마엄마 동화',
    label: '아이를 위한 엄마엄마 동화',
    route: '/',
    desc: 'AI 대화로 만드는 동화',
    duration: '~15분',
    gradient: 'linear-gradient(135deg, #E07A5F, #C96B52)',
    shadow: 'rgba(224,122,95,0.3)',
  },
  diy: {
    id: 'diy',
    name: 'DIY 동화',
    label: '아이와 함께 만드는 DIY 동화',
    route: '/diy/guide',
    desc: '직접 꾸미는 동화',
    duration: '~10분',
    gradient: 'linear-gradient(135deg, #7FBFB0, #5EA89A)',
    shadow: 'rgba(127,191,176,0.3)',
  },
  tq: {
    id: 'tq',
    name: '딸깍 동화',
    label: '나를 위한 스무고개 딸깍 동화',
    route: '/dalkkak',
    desc: '질문으로 만드는 동화',
    duration: '~10분',
    gradient: 'linear-gradient(135deg, #9B8EC4, #7B6FA0)',
    shadow: 'rgba(155,142,196,0.3)',
  },
} as const;

export type ServiceId = keyof typeof SERVICES;
export type Service = (typeof SERVICES)[ServiceId];
