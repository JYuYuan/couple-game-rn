import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {AntDesign, Ionicons, MaterialIcons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';


export default function Home() {
    const router = useRouter();
    const {t} = useTranslation();

    // 主题颜色
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;

    // 浮动动画
    const floatAnimation = useSharedValue(0);
    const rotateAnimation = useSharedValue(0);

    React.useEffect(() => {
        floatAnimation.value = withRepeat(
            withSequence(
                withTiming(1, {duration: 3000}),
                withTiming(0, {duration: 3000})
            ),
            -1
        );

        rotateAnimation.value = withRepeat(
            withTiming(360, {duration: 20000}),
            -1
        );
    }, []);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [
            {translateY: interpolate(floatAnimation.value, [0, 1], [0, -20])},
        ],
    }));

    const rotatingStyle = useAnimatedStyle(() => ({
        transform: [
            {rotate: `${rotateAnimation.value}deg`},
        ],
    }));

    const gameOptions = [
        {
            title: t('home.flyingChess.title', '飞行棋'),
            subtitle: t('home.flyingChess.subtitle', '策略对战'),
            description: t('home.flyingChess.description', '体验策略与运气的完美结合'),
            icon: 'airplane',
            iconType: 'Ionicons',
            href: '/game-mode',
            gradient: ['#5E5CE6', '#BF5AF2'],
            accentColor: '#5E5CE6',
        },
        {
            title: t('home.luckyWheel.title', '情侣任务'),
            subtitle: t('home.luckyWheel.subtitle', '趣味互动'),
            description: t('home.luckyWheel.description', '专为情侣设计的互动任务'),
            icon: 'heart',
            iconType: 'Ionicons',
            href: '/game-mode',
            gradient: ['#FF6482', '#FF9F40'],
            accentColor: '#FF6482',
        },
    ];

    const GameCard = ({game, colors}: any) => {
        const scale = useSharedValue(1);
        const opacity = useSharedValue(1);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{scale: scale.value}],
            opacity: opacity.value,
        }));

        const handlePressIn = () => {
            scale.value = withSpring(0.95);
            opacity.value = withTiming(0.8);
        };

        const handlePressOut = () => {
            scale.value = withSpring(1);
            opacity.value = withTiming(1);
        };

        const IconComponent = game.iconType === 'Ionicons' ? Ionicons :
            game.iconType === 'AntDesign' ? AntDesign : MaterialIcons;

        return (
            <Animated.View style={[animatedStyle, {marginBottom: 20}]}>
                <Pressable
                    onPress={() => router.push(game.href)}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <View style={styles.cardContainer}>
                        <BlurView intensity={80} tint={colors.homeBlurTint} style={styles.blurContainer}>
                            <View style={[styles.cardContent, {
                                backgroundColor: colors.homeCardBackground,
                                borderColor: colors.homeCardBorder
                            }]}>
                                {/* 图标区域 */}
                                <View style={[styles.iconContainer, {backgroundColor: game.accentColor + '15'}]}>
                                    <LinearGradient
                                        colors={game.gradient}
                                        style={styles.iconGradient}
                                        start={{x: 0, y: 0}}
                                        end={{x: 1, y: 1}}
                                    >
                                        <IconComponent name={game.icon} size={32} color="white"/>
                                    </LinearGradient>
                                </View>

                                {/* 文字内容 */}
                                <View style={styles.textContainer}>
                                    <Text style={[styles.cardTitle, {color: colors.homeCardTitle}]}>{game.title}</Text>
                                    <Text style={[styles.cardSubtitle, {color: game.accentColor}]}>
                                        {game.subtitle}
                                    </Text>
                                    <Text
                                        style={[styles.cardDescription, {color: colors.homeCardDescription}]}>{game.description}</Text>
                                </View>

                                {/* 箭头 */}
                                <View style={[styles.arrowContainer, {backgroundColor: colors.homeCardArrowBg}]}>
                                    <Ionicons name="chevron-forward" size={24} color={colors.homeCardArrow}/>
                                </View>
                            </View>
                        </BlurView>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, {backgroundColor: colors.homeBackground}]}>
            {/* 背景渐变 */}
            <LinearGradient
                colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
                style={StyleSheet.absoluteFillObject}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
            />

            {/* 装饰性背景元素 */}
            <View style={styles.decorativeContainer}>
                <Animated.View style={[styles.decorativeCircle1, rotatingStyle]}>
                    <LinearGradient
                        colors={['#5E5CE6', '#BF5AF2']}
                        style={styles.gradientCircle}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    />
                </Animated.View>

                <Animated.View style={[styles.decorativeCircle2, floatingStyle]}>
                    <LinearGradient
                        colors={['#FF6482', '#FF9F40']}
                        style={styles.gradientCircle}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    />
                </Animated.View>
            </View>

            {/* 主内容 */}
            <View style={styles.contentContainer}>
                {/* 标题区域 */}
                <Animated.View style={[styles.headerContainer, floatingStyle]}>
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['#5E5CE6', '#BF5AF2']}
                            style={styles.logoGradient}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                        >
                            <MaterialIcons name="favorite" size={40} color="white"/>
                        </LinearGradient>
                    </View>

                    <Text style={[styles.mainTitle, {color: colors.homeTitle}]}>{t('home.title', '情侣游戏')}</Text>
                    <Text
                        style={[styles.subtitle, {color: colors.homeSubtitle}]}>{t('home.subtitle', '一起玩游戏，增进感情')}</Text>
                </Animated.View>

                {/* 游戏卡片 */}
                <View style={styles.cardsContainer}>
                    {gameOptions.map((game, index) => (
                        <GameCard key={game.title} game={game} colors={colors} index={index}/>
                    ))}
                </View>

                {/* 底部提示 */}
                <View style={styles.footerContainer}>
                    <BlurView intensity={60} tint={colors.homeBlurTint} style={styles.footerBlur}>
                        <View style={styles.footerContent}>
                            <Ionicons name="sparkles" size={18} color="#5E5CE6"/>
                            <Text style={[styles.footerText, {color: colors.homeFooterText}]}>
                                {t('home.cta.subtext', '选择你喜欢的游戏模式开始吧')}
                            </Text>
                        </View>
                    </BlurView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    decorativeContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    decorativeCircle1: {
        position: 'absolute',
        top: -100,
        right: -50,
        width: 300,
        height: 300,
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: 50,
        left: -100,
        width: 250,
        height: 250,
    },
    gradientCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 150,
        opacity: 0.1,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 80,
        paddingBottom: 40,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        marginBottom: 24,
        shadowColor: '#5E5CE6',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
        borderRadius: 30,
        overflow: 'hidden',
    },
    logoGradient: {
        width: 100,
        height: 100,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    mainTitle: {
        fontSize: 42,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '500',
    },
    cardsContainer: {
        flex: 1,
        paddingTop: 20,
    },
    cardContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    blurContainer: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        padding: 4,
        marginRight: 16,
    },
    iconGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    arrowContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    footerContainer: {
        marginTop: 30,
        alignItems: 'center',
        marginBottom: 60,
    },
    footerBlur: {
        borderRadius: 20,
        overflow: 'hidden',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '500',
    },
});