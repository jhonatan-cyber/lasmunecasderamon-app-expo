import React from "react";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { Room, Anfitriona, Client } from "@/hooks/useGarzonServiciosScreen";

interface GarzonServiciosModalesProps {
  roomModalVisible: boolean;
  setRoomModalVisible: (visible: boolean) => void;
  rooms: Room[];
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  setServicePrice: (price: string) => void;

  hostessModalVisible: boolean;
  setHostessModalVisible: (visible: boolean) => void;
  anfitrionas: Anfitriona[];
  selectedHostesses: number[];
  toggleHostess: (id: number | string) => void;
  maxHostesses: number;

  clientModalVisible: boolean;
  setClientModalVisible: (visible: boolean) => void;
  clients: Client[];
  selectedClients: (number | string)[];
  toggleClient: (id: number | string) => void;
  maxClients: number;
}

export const GarzonServiciosModales: React.FC<GarzonServiciosModalesProps> = ({
  roomModalVisible,
  setRoomModalVisible,
  rooms,
  selectedRoom,
  setSelectedRoom,
  setServicePrice,
  hostessModalVisible,
  setHostessModalVisible,
  anfitrionas,
  selectedHostesses,
  toggleHostess,
  maxHostesses,
  clientModalVisible,
  setClientModalVisible,
  clients,
  selectedClients,
  toggleClient,
  maxClients,
}) => {
  return (
    <>
      <RoomSelectModal
        visible={roomModalVisible}
        onClose={() => setRoomModalVisible(false)}
        onSelect={(room) => {
          setSelectedRoom(room as any);
          if (
            (room as any).comision_anfitriona &&
            (room as any).comision_anfitriona > 0
          ) {
            setServicePrice("");
          }
          setRoomModalVisible(false);
        }}
        rooms={rooms
          .filter(
            (r) =>
              r.status === 1 &&
              (r.precio || r.price || 0) > 0 &&
              (r.tiempo || r.time || 0) > 0,
          )
          .map((r) => ({
            ...r,
            nombre: r.nombre || r.name || r.numero,
            precio: r.precio || r.price || 0,
            tiempo: r.tiempo || r.time || 0,
            estado: r.status,
          }))}
        selectedRoomId={selectedRoom?.id_habitacion || selectedRoom?.id}
      />

      <HostessSelectModal
        visible={hostessModalVisible}
        onClose={() => setHostessModalVisible(false)}
        onConfirm={() => setHostessModalVisible(false)}
        onToggle={toggleHostess}
        hostesses={anfitrionas as any}
        selectedIds={selectedHostesses}
        max={maxHostesses}
      />

      <ClientSelectModal
        visible={clientModalVisible}
        onClose={() => setClientModalVisible(false)}
        onToggle={toggleClient}
        clients={clients as any}
        selectedIds={selectedClients}
        max={maxClients}
      />
    </>
  );
};
