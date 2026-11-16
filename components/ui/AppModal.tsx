import React from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    View,
    type ModalProps,
} from 'react-native';

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
export function AppModal({ children, onRequestClose, avoidKeyboard = true, ...rest }: AppModalProps) {
    return (
        <Modal
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
        </Modal>
    );
}
