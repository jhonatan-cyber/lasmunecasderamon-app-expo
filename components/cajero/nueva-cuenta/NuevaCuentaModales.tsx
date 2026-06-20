import React from 'react';
import { ClientSelectModal } from '@/components/cajero/forms/ClientSelectModal';
import { RoomSelectModal } from '@/components/cajero/forms/RoomSelectModal';
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import { CategoryProductsModal } from './CategoryProductsModal';
import { DurationTimeModal } from './DurationTimeModal';

interface NuevaCuentaModalesProps {
    
    clientModalVisible: boolean;
    clientes: any[];
    selectedCliente: any;
    onCloseClient: () => void;
    onSelectCliente: (client: any) => void;

    
    roomModalVisible: boolean;
    habitaciones: any[];
    selectedHabitacion: any;
    onCloseRoom: () => void;
    onSelectHabitacion: (room: any) => void;

    
    hostessSubModalVisible: boolean;
    hostessSelectionTarget: any;
    anfitrionas: any[];
    modalHostessSelections: { [key: number]: (string | number)[] };
    onToggleHostess: (id: string | number) => void;
    onCloseHostess: () => void;
    onConfirmHostess: () => void;

    
    modalOpen: boolean;
    modalCategoria: any;
    modalLoading: boolean;
    modalProducts: any[];
    modalQuantities: { [key: number]: number };
    onCloseCategory: () => void;
    onSetQuantity: (productId: number, quantity: number) => void;
    onSetHostessTarget: (target: any) => void;
    addProductToCart: (product: any) => void;
    isChampagneProduct: (product: any) => boolean;

    
    timeModalVisible: boolean;
    selectedTime: number;
    onCloseTime: () => void;
    onSelectTime: (time: number) => void;

    
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
}

export function NuevaCuentaModales({
    clientModalVisible,
    clientes,
    selectedCliente,
    onCloseClient,
    onSelectCliente,

    roomModalVisible,
    habitaciones,
    selectedHabitacion,
    onCloseRoom,
    onSelectHabitacion,

    hostessSubModalVisible,
    hostessSelectionTarget,
    anfitrionas,
    modalHostessSelections,
    onToggleHostess,
    onCloseHostess,
    onConfirmHostess,

    modalOpen,
    modalCategoria,
    modalLoading,
    modalProducts,
    modalQuantities,
    onCloseCategory,
    onSetQuantity,
    onSetHostessTarget,
    addProductToCart,
    isChampagneProduct,

    timeModalVisible,
    selectedTime,
    onCloseTime,
    onSelectTime,

    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
}: NuevaCuentaModalesProps) {
    return (
        <>
            <CategoryProductsModal
                visible={modalOpen}
                categoria={modalCategoria}
                loading={modalLoading}
                products={modalProducts}
                quantities={modalQuantities}
                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                onClose={onCloseCategory}
                onSetQuantity={onSetQuantity}
                onSetHostessTarget={onSetHostessTarget}
                addProductToCart={addProductToCart}
                isChampagneProduct={isChampagneProduct}
            />

            <ClientSelectModal
                visible={clientModalVisible}
                clients={clientes}
                selectedIds={selectedCliente ? [selectedCliente.id_cliente || selectedCliente.id] : []}
                max={1}
                onClose={onCloseClient}
                onToggle={(id) => {
                    const client = clientes.find(c => String(c.id_cliente || c.id) === String(id));
                    if (client) {
                        onSelectCliente(client);
                    }
                }}
            />

            <RoomSelectModal
                visible={roomModalVisible}
                rooms={habitaciones}
                selectedRoomId={selectedHabitacion?.id_habitacion || selectedHabitacion?.id}
                onClose={onCloseRoom}
                onSelect={onSelectHabitacion}
            />

            <HostessSelectModal
                visible={hostessSubModalVisible && hostessSelectionTarget !== null}
                hostesses={anfitrionas
                    .filter((item: any, index: number, self: any[]) => 
                        index === self.findIndex((t: any) => (t.id_usuario || t.id) === (item.id_usuario || item.id))
                    )
                    .map((a: any) => ({
                        id: a.id_usuario || a.id,
                        id_usuario: a.id_usuario || a.id,
                        nick: a.nick,
                        status: a.status || 0,
                        estado_servicio: a.estado_servicio || 0
                    }))}
                selectedIds={hostessSelectionTarget ? (modalHostessSelections[hostessSelectionTarget.productId] || []) : []}
                max={hostessSelectionTarget?.max}
                onToggle={onToggleHostess}
                onClose={onCloseHostess}
                onConfirm={onConfirmHostess}
            />

            <DurationTimeModal
                visible={timeModalVisible}
                selectedTime={selectedTime}
                accentColor={accentColor}
                cardBg={cardBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                onClose={onCloseTime}
                onSelectTime={onSelectTime}
            />
        </>
    );
}

