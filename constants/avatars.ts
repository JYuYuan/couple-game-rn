import { AvatarGender } from '@/types/settings'

export interface AvatarOption {
  id: string
  gender: AvatarGender
  source: any
}

// 男性头像
const manAvatars: AvatarOption[] = [
  {
    id: 'b1-COq11GXB.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b1-COq11GXB.png'),
  },
  {
    id: 'b2-C19-jRuP.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b2-C19-jRuP.png'),
  },
  {
    id: 'b3-DpiQnDVf.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b3-DpiQnDVf.png'),
  },
  {
    id: 'b4-C1eJe0Dx.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b4-C1eJe0Dx.png'),
  },
  {
    id: 'b5-Dd9LwNun.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b5-Dd9LwNun.png'),
  },
  {
    id: 'b6-W20zcH3F.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b6-W20zcH3F.png'),
  },
  {
    id: 'b7-CTuxIcEu.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b7-CTuxIcEu.png'),
  },
  {
    id: 'b8-DrviVjMZ.png',
    gender: 'man',
    source: require('@/assets/images/avatar/man/b8-DrviVjMZ.png'),
  },
]

// 女性头像
const womanAvatars: AvatarOption[] = [
  {
    id: 'g1-7KQTv8t5.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g1-7KQTv8t5.png'),
  },
  {
    id: 'g2-BUABWAfK.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g2-BUABWAfK.png'),
  },
  {
    id: 'g3-ByPt2FMD.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g3-ByPt2FMD.png'),
  },
  {
    id: 'g4-NwcKMkN4.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g4-NwcKMkN4.png'),
  },
  {
    id: 'g5-jYn9VEqo.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g5-jYn9VEqo.png'),
  },
  {
    id: 'g6-DjCmaBec.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g6-DjCmaBec.png'),
  },
  {
    id: 'g7-DbTI4CEb.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g7-DbTI4CEb.png'),
  },
  {
    id: 'g8-C6UimjUl.png',
    gender: 'woman',
    source: require('@/assets/images/avatar/womon/g8-C6UimjUl.png'),
  },
]

export const AVATARS = {
  man: manAvatars,
  woman: womanAvatars,
}

// 获取头像资源
export const getAvatarSource = (gender: AvatarGender, avatarId: string) => {
  const avatars = AVATARS[gender]
  const avatar = avatars.find((a) => a.id === avatarId)
  return avatar?.source || AVATARS.man[0].source
}

// 根据性别随机选择一个头像
export const getRandomAvatarByGender = (gender: AvatarGender): AvatarOption => {
  const avatars = AVATARS[gender]
  const randomIndex = Math.floor(Math.random() * avatars.length)
  return avatars[randomIndex]
}
