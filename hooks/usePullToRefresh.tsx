import { useState, useCallback } from 'react';
import {
    RefreshControl,
    RefreshControlProps,
    ScrollView,
    FlatList,
    View,
    StyleSheet,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';

interface UsePullToRefreshOptions {
    onRefresh: () => Promise<void>;
    refreshing?: boolean;
    threshold?: number;
    enabled?: boolean;
}

interface UsePullToRefreshReturn {
    refreshing: boolean;
    triggerRefresh: () => void;
    RefreshControlComponent: React.FC<Partial<RefreshControlProps>>;
}

export const usePullToRefresh = ({
    onRefresh,
    refreshing: externalRefreshing = false,
    threshold = 80,
    enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn => {
    const [internalRefreshing, setInternalRefreshing] = useState(false);

    const refreshing = externalRefreshing || internalRefreshing;

    const triggerRefresh = useCallback(async () => {
        if (refreshing) return;
        
        setInternalRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setInternalRefreshing(false);
        }
    }, [onRefresh, refreshing]);

    const RefreshControlComponent: React.FC<Partial<RefreshControlProps>> = (props) => (
        <RefreshControl
            {...props}
            refreshing={refreshing}
            onRefresh={triggerRefresh}
            enabled={enabled}
            tintColor="#6366f1"
            colors={['#6366f1']}
            progressViewOffset={threshold}
        />
    );

    return { refreshing, triggerRefresh, RefreshControlComponent };
};

interface PullToRefreshScrollViewProps {
    onRefresh: () => Promise<void>;
    refreshing?: boolean;
    children: React.ReactNode;
    contentContainerStyle?: any;
    showsVerticalScrollIndicator?: boolean;
    enabled?: boolean;
}

export const PullToRefreshScrollView: React.FC<PullToRefreshScrollViewProps> = ({
    onRefresh,
    refreshing = false,
    children,
    contentContainerStyle,
    showsVerticalScrollIndicator = false,
    enabled = true,
}) => {
    const { RefreshControlComponent } = usePullToRefresh({
        onRefresh,
        refreshing,
        enabled,
    });

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            refreshControl={<RefreshControlComponent />}
        >
            {children}
        </ScrollView>
    );
};

interface PullToRefreshListProps<T> {
    data: T[];
    onRefresh: () => Promise<void>;
    renderItem: (item: { item: T; index: number }) => React.ReactElement;
    keyExtractor: (item: T, index: number) => string;
    refreshing?: boolean;
    ListEmptyComponent?: React.ReactElement | null;
    ListHeaderComponent?: React.ReactElement | null;
    ListFooterComponent?: React.ReactElement | null;
    contentContainerStyle?: any;
    enabled?: boolean;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
}

export function PullToRefreshList<T>({
    data,
    onRefresh,
    renderItem,
    keyExtractor,
    refreshing = false,
    ListEmptyComponent = null,
    ListHeaderComponent = null,
    ListFooterComponent = null,
    contentContainerStyle,
    enabled = true,
    onEndReached,
    onEndReachedThreshold = 0.5,
}: PullToRefreshListProps<T>) {
    const { RefreshControlComponent } = usePullToRefresh({
        onRefresh,
        refreshing,
        enabled,
    });

    return (
        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            contentContainerStyle={[
                styles.listContent,
                data.length === 0 && styles.emptyList,
                contentContainerStyle,
            ]}
            refreshControl={<RefreshControlComponent />}
            onEndReached={onEndReached}
            onEndReachedThreshold={onEndReachedThreshold}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
        />
    );
}

export const PullToRefreshView: React.FC<{
    onRefresh: () => Promise<void>;
    refreshing?: boolean;
    children: React.ReactNode;
    style?: any;
    enabled?: boolean;
}> = ({ onRefresh, refreshing = false, children, style, enabled = true }) => {
    const { RefreshControlComponent } = usePullToRefresh({
        onRefresh,
        refreshing,
        enabled,
    });

    return (
        <View style={[styles.view, style]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControlComponent />}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    view: {
        flex: 1,
    },
});

export default usePullToRefresh;