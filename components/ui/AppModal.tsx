import React, { useEffect } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    View,
    type ModalProps,
} from 'react-native';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { setModalLayerOpen } from '@/utils/modalLayer';

export type AppModalProps = ModalProps & {
    /**
     * Desplaza el contenido sobre el teclado. Se desactiva en los modales que
     * ya envuelven su contenido en su propio `KeyboardAvoidingView` para no
     * aplicar el desplazamiento dos veces.
     */
    avoidKeyboard?: boolean;
};

/**
 * Envoltorio de `Modal` con los valores que casi todos los modales de la app
 * repetían (o olvidaban): cierre por botón físico en Android, contención de
 * accesibilidad para que VoiceOver/TalkBack no lean la pantalla de fondo y
 * desplazamiento sobre el teclado (clave en horizontal, donde hay poco alto).
 *
 * Se usa como reemplazo directo:
 *
 * ```tsx
 * import { AppModal as Modal } from '@/components/ui/AppModal';
 * ```
 */
export function AppModal({ children, onRequestClose, avoidKeyboard = true, visible, ...rest }: AppModalProps) {
    useEffect(() => {
        if (!visible) return;
        setModalLayerOpen(true);
        return () => setModalLayerOpen(false);
    }, [visible]);

    return (
        <Modal
            visible={visible}
            onRequestClose={onRequestClose ?? (() => { })}
            {...rest}
        >
            {/*
             * En Android la actividad usa `adjustResize`, así que el sistema ya
             * encoge la ventana; aplicar `height` aquí encogería dos veces. En
             * iOS no hay resize y el padding es lo que mantiene el foco visible.
             */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                enabled={avoidKeyboard}
            >
                <View style={{ flex: 1 }} accessibilityViewIsModal>
                    {children}
                </View>
            </KeyboardAvoidingView>
            {/* Un modal nativo queda por encima de la raíz: el banner viaja con él. */}
            <NotificationBanner layer="modal" />
        </Modal>
    );
}
