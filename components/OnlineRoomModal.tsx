import React, {useEffect, useState} from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import {useTranslation} from 'react-i18next';
import {useSocket} from '@/hooks/use-socket';
import {CreateRoomData, JoinRoomData} from '@/types/online';
import {LinearGradient} from 'expo-linear-gradient';
import {TaskSet} from "@/types/tasks";

interface OnlineRoomModalProps {
    visible: boolean;
    onClose: () => void;
    taskSet: TaskSet | null;
    gameType: 'fly' | 'wheel' | 'minesweeper';
    onRoomJoined: (roomId: string) => void;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
                                                                    visible,
                                                                    onClose,
                                                                    taskSet,
                                                                    gameType,
                                                                    onRoomJoined
                                                                }) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;
    const {t} = useTranslation();
    const socket = useSocket();
    console.log(socket);

    const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
    const [playerName, setPlayerName] = useState('');
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [isLoading, setIsLoading] = useState(false);

    // 连接Socket（只有在模态框显示且未连接时才连接）
    useEffect(() => {
        if (visible && !socket.isConnected) {
            console.log('OnlineRoomModal: Socket not connected, connecting...');
            socket.connect();
        } else if (visible && socket.isConnected) {
            console.log('OnlineRoomModal: Socket already connected:', socket.isConnected);
        }
    }, [visible, socket]);

    // 根据游戏类型和任务集设置默认房间名
    useEffect(() => {
        if (visible) {
            const gameTypeName = getGameTypeText(gameType);
            // 生成基于任务集的房间名
            setRoomName(`${gameTypeName}-${taskSet?.id}_${Date.now().toString().slice(-4)}`);
        }
    }, [visible, gameType, taskSet?.id]);

    // 监听房间更新
    useEffect(() => {
        if (socket.currentRoom) {
            onRoomJoined(socket.currentRoom.id);
            onClose();
        }
    }, [socket.currentRoom, onRoomJoined, onClose]);

    const handleCreateRoom = async () => {
        if (!playerName.trim() || !roomName.trim()) {
            Alert.alert(t('common.error', '错误'), t('online.error.fillRequired', '请填写所有必需信息'));
            return;
        }

        setIsLoading(true);
        try {
            const createData: CreateRoomData = {
                roomName: roomName.trim(),
                playerName: playerName.trim(),
                maxPlayers,
                taskSetId: taskSet?.id || "", // 使用传入的任务集ID
                gameType   // 使用传入的游戏类型
            };

            console.log('Creating room with task set:', taskSet?.id, 'and game type:', gameType);
            await socket.createRoom(createData);
        } catch (error) {
            console.error('创建房间失败:', error);
            Alert.alert(t('common.error', '错误'), error instanceof Error ? error.message : t('online.error.createFailed', '创建房间失败'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async (roomId?: string) => {
        const targetRoomId = roomId || roomCode.trim();

        if (!playerName.trim() || !targetRoomId) {
            Alert.alert(t('common.error', '错误'), t('online.error.fillRequired', '请填写所有必需信息'));
            return;
        }

        setIsLoading(true);
        try {
            const joinData: JoinRoomData = {
                roomId: targetRoomId,
                playerName: playerName.trim()
            };

            await socket.joinRoom(joinData);
        } catch (error) {
            console.error('加入房间失败:', error);
            Alert.alert(t('common.error', '错误'), error instanceof Error ? error.message : t('online.error.joinFailed', '加入房间失败'));
        } finally {
            setIsLoading(false);
        }
    };

    const getGameTypeText = (type: string) => {
        switch (type) {
            case 'fly':
                return t('gameMode.flyingChess', '飞行棋');
            case 'wheel':
                return t('gameMode.wheel', '大转盘');
            case 'minesweeper':
                return t('gameMode.minesweeper', '扫雷对战');
            default:
                return type;
        }
    };


    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop}/>
                </TouchableWithoutFeedback>

                <View style={[styles.modalContainer, {backgroundColor: colors.homeCardBackground}]}>
                    {/* 头部 */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, {color: colors.homeCardTitle}]}>
                                {t('online.title', '在线房间')}
                            </Text>
                            <Text style={[styles.subtitle, {color: colors.homeCardDescription}]}>
                                {getGameTypeText(gameType)} • {taskSet?.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.homeCardDescription}/>
                        </TouchableOpacity>
                    </View>

                    {/* 连接状态 */}
                    <View style={[styles.connectionStatus, {
                        backgroundColor: socket.isConnected ? '#4CAF50' + '20' : '#FF6B6B' + '20'
                    }]}>
                        <Ionicons
                            name={socket.isConnected ? 'checkmark-circle' : 'close-circle'}
                            size={16}
                            color={socket.isConnected ? '#4CAF50' : '#FF6B6B'}
                        />
                        <Text style={[styles.connectionText, {
                            color: socket.isConnected ? '#4CAF50' : '#FF6B6B'
                        }]}>
                            {socket.isConnected ? t('online.connected', '已连接') :
                                socket.connectionError || t('online.disconnected', '未连接')}
                        </Text>
                        {!socket.isConnected && (
                            <TouchableOpacity onPress={socket.connect}>
                                <Text style={[styles.retryText, {color: colors.settingsAccent}]}>
                                    {t('online.retry', '重试')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Tab切换 */}
                    <View style={[styles.tabContainer, {backgroundColor: colors.homeBackground}]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'join' && {backgroundColor: colors.settingsAccent + '20'}]}
                            onPress={() => setActiveTab('join')}
                        >
                            <Text style={[styles.tabText, {
                                color: activeTab === 'join' ? colors.settingsAccent : colors.homeCardDescription
                            }]}>
                                {t('online.tabs.join', '加入房间')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'create' && {backgroundColor: colors.settingsAccent + '20'}]}
                            onPress={() => setActiveTab('create')}
                        >
                            <Text style={[styles.tabText, {
                                color: activeTab === 'create' ? colors.settingsAccent : colors.homeCardDescription
                            }]}>
                                {t('online.tabs.create', '创建房间')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* 内容区域 */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {activeTab === 'join' && (
                            <View style={styles.joinForm}>
                                <Text style={[styles.formTitle, {color: colors.homeCardTitle}]}>
                                    {t('online.join.title', '加入房间')}
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, {color: colors.homeCardDescription}]}>
                                        {t('online.playerName', '玩家名称')}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, {
                                            backgroundColor: colors.homeBackground,
                                            borderColor: colors.homeCardBorder,
                                            color: colors.homeCardTitle
                                        }]}
                                        value={playerName}
                                        onChangeText={setPlayerName}
                                        placeholder={t('online.playerName.placeholder', '请输入你的名称')}
                                        placeholderTextColor={colors.homeCardDescription}
                                        maxLength={20}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, {color: colors.homeCardDescription}]}>
                                        {t('online.roomCode', '房间代码')}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, {
                                            backgroundColor: colors.homeBackground,
                                            borderColor: colors.homeCardBorder,
                                            color: colors.homeCardTitle
                                        }]}
                                        value={roomCode}
                                        onChangeText={setRoomCode}
                                        placeholder={t('online.roomCode.placeholder', '请输入房间代码')}
                                        placeholderTextColor={colors.homeCardDescription}
                                        autoCapitalize="characters"
                                        maxLength={6}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionButton, {opacity: isLoading ? 0.6 : 1}]}
                                    onPress={() => handleJoinRoom()}
                                    disabled={isLoading || !socket.isConnected}
                                >
                                    <LinearGradient
                                        colors={['#4CAF50', '#66BB6A']}
                                        style={styles.buttonGradient}
                                    >
                                        <Ionicons name="enter" size={20} color="white"/>
                                        <Text style={styles.buttonText}>
                                            {isLoading ? t('online.joining', '加入中...') : t('online.join.button', '加入房间')}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {activeTab === 'create' && (
                            <View style={styles.createForm}>
                                <Text style={[styles.formTitle, {color: colors.homeCardTitle}]}>
                                    {t('online.create.title', '创建房间')}
                                </Text>

                                {/* 游戏信息显示 */}
                                <View style={[styles.gameInfoCard, {
                                    backgroundColor: colors.homeBackground,
                                    borderColor: colors.homeCardBorder
                                }]}>
                                    <View style={styles.gameInfoRow}>
                                        <Ionicons name="game-controller" size={16} color={colors.settingsAccent}/>
                                        <Text style={[styles.gameInfoLabel, {color: colors.homeCardDescription}]}>
                                            {t('online.gameType', '游戏类型')}:
                                        </Text>
                                        <Text style={[styles.gameInfoValue, {color: colors.homeCardTitle}]}>
                                            {getGameTypeText(gameType)}
                                        </Text>
                                    </View>
                                    <View style={styles.gameInfoRow}>
                                        <Ionicons name="list" size={16} color={colors.settingsAccent}/>
                                        <Text style={[styles.gameInfoLabel, {color: colors.homeCardDescription}]}>
                                            {t('online.taskSet', '任务集')}:
                                        </Text>
                                        <Text style={[styles.gameInfoValue, {color: colors.homeCardTitle}]}>
                                            {taskSet?.name || taskSet?.id}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, {color: colors.homeCardDescription}]}>
                                        {t('online.playerName', '玩家名称')}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, {
                                            backgroundColor: colors.homeBackground,
                                            borderColor: colors.homeCardBorder,
                                            color: colors.homeCardTitle
                                        }]}
                                        value={playerName}
                                        onChangeText={setPlayerName}
                                        placeholder={t('online.playerName.placeholder', '请输入你的名称')}
                                        placeholderTextColor={colors.homeCardDescription}
                                        maxLength={20}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, {color: colors.homeCardDescription}]}>
                                        {t('online.roomName', '房间名称')}
                                    </Text>
                                    <TextInput
                                        style={[styles.input, {
                                            backgroundColor: colors.homeBackground,
                                            borderColor: colors.homeCardBorder,
                                            color: colors.homeCardTitle
                                        }]}
                                        value={roomName}
                                        onChangeText={setRoomName}
                                        placeholder={t('online.roomName.placeholder', '请输入房间名称')}
                                        placeholderTextColor={colors.homeCardDescription}
                                        maxLength={30}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, {color: colors.homeCardDescription}]}>
                                        {t('online.maxPlayers', '最大玩家数')}
                                    </Text>
                                    <View style={styles.playerCountSelector}>
                                        {[2, 3, 4].map(count => (
                                            <TouchableOpacity
                                                key={count}
                                                style={[
                                                    styles.playerCountButton,
                                                    {
                                                        backgroundColor: maxPlayers === count ? colors.settingsAccent + '20' : colors.homeBackground,
                                                        borderColor: maxPlayers === count ? colors.settingsAccent : colors.homeCardBorder
                                                    }
                                                ]}
                                                onPress={() => setMaxPlayers(count)}
                                            >
                                                <Text style={[
                                                    styles.playerCountText,
                                                    {color: maxPlayers === count ? colors.settingsAccent : colors.homeCardDescription}
                                                ]}>
                                                    {count}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionButton, {opacity: isLoading ? 0.6 : 1}]}
                                    onPress={handleCreateRoom}
                                    disabled={isLoading || !socket.isConnected}
                                >
                                    <LinearGradient
                                        colors={['#5E5CE6', '#BF5AF2']}
                                        style={styles.buttonGradient}
                                    >
                                        <Ionicons name="add" size={20} color="white"/>
                                        <Text style={styles.buttonText}>
                                            {isLoading ? t('online.creating', '创建中...') : t('online.create.button', '创建房间')}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    modalContainer: {
        height: '80%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
        opacity: 0.8,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 8,
        gap: 8,
    },
    connectionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        margin: 20,
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 6,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    joinForm: {
        paddingBottom: 20,
    },
    createForm: {
        paddingBottom: 20,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    gameInfoCard: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    gameInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    gameInfoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    gameInfoValue: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
    },
    playerCountSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    playerCountButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    playerCountText: {
        fontSize: 16,
        fontWeight: '600',
    },
    actionButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 20,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});