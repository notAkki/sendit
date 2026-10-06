"use client"

import { startTransition, useState, type DragEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  GripVerticalIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  reorderMyRoomsAction,
  setMyRoomArchivedAction,
} from "@/app/actions/sendit"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { stringColor } from "@/lib/participant-colors"
import { cn } from "@/lib/utils"
import type { JoinedRoomSummary } from "@/lib/types"

function RoomVisual({ entry }: { entry: JoinedRoomSummary }) {
  const color = stringColor(entry.room.name)
  const initial = Array.from(entry.room.name.trim())[0]?.toLocaleUpperCase() || "?"

  return (
    <Avatar
      className="border after:border-0"
      style={{ borderColor: color }}
    >
      <AvatarFallback
        className="font-medium"
        style={{
          backgroundColor: `color-mix(in oklch, ${color} 14%, var(--background))`,
          color: `color-mix(in oklch, ${color} 70%, var(--foreground))`,
        }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}

function participantSummary(entry: JoinedRoomSummary) {
  const participants = entry.participants.length ? entry.participants : [entry.member]
  const visible = participants.slice(0, 3).map((participant) => participant.name)
  const remaining = participants.length - visible.length
  return `${visible.join(", ")}${remaining > 0 ? ` +${remaining}` : ""}`
}

function RoomRow({
  entry,
  archived,
  disabled,
  onArchive,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  entry: JoinedRoomSummary
  archived: boolean
  disabled: boolean
  onArchive: (archived: boolean) => void
  isDropTarget?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnd?: () => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={cn(
        "hover:bg-muted/50 focus-within:bg-muted/50 flex items-center transition-colors",
        isDropTarget && "bg-muted/70",
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {!archived ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-1 cursor-grab active:cursor-grabbing"
          draggable={!disabled}
          disabled={disabled}
          aria-label={`Drag to reorder ${entry.room.name}`}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <GripVerticalIcon />
        </Button>
      ) : null}

      <Link
        href={`/r/${entry.room.code}`}
        className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 px-2 py-4 outline-none focus-visible:ring-2"
      >
        <RoomVisual entry={entry} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{entry.room.name}</p>
          <p className="text-muted-foreground truncate text-sm">
            {participantSummary(entry)}
          </p>
        </div>
      </Link>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`${archived ? "Restore" : "Archive"} ${entry.room.name}`}
        disabled={disabled}
        onClick={() => onArchive(!archived)}
      >
        {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
      </Button>

      <Link
        href={`/r/${entry.room.code}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "mr-1")}
        aria-label={`Open ${entry.room.name}`}
      >
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  )
}

export function SavedRoomList({ rooms }: { rooms: JoinedRoomSummary[] }) {
  const router = useRouter()
  const [showArchived, setShowArchived] = useState(false)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)
  const sourceActiveRooms = rooms.filter((entry) => !entry.isArchived)
  const sourceRoomIds = sourceActiveRooms.map((entry) => entry.room.id)
  const [orderedRoomIds, setOrderedRoomIds] = useState(sourceRoomIds)
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null)
  const [dropTargetRoomId, setDropTargetRoomId] = useState<string | null>(null)
  const archivedRooms = rooms.filter((entry) => entry.isArchived)
  const activeRoomsById = new Map(sourceActiveRooms.map((entry) => [entry.room.id, entry]))
  const activeRooms = orderedRoomIds
    .map((roomId) => activeRoomsById.get(roomId))
    .filter((entry): entry is JoinedRoomSummary => Boolean(entry))

  function run(roomId: string, action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPendingRoomId(roomId)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error || "Something went wrong.")
      } else {
        toast.success(success)
        router.refresh()
      }
      setPendingRoomId(null)
    })
  }

  function saveRoomOrder(roomIds: string[], movedRoomId: string) {
    const previousOrder = orderedRoomIds
    setOrderedRoomIds(roomIds)
    setPendingRoomId(movedRoomId)
    startTransition(async () => {
      const result = await reorderMyRoomsAction({ roomIds })
      if (!result.ok) {
        setOrderedRoomIds(previousOrder)
        toast.error(result.error || "The room order could not be saved.")
      } else {
        router.refresh()
      }
      setPendingRoomId(null)
    })
  }

  function dropRoom(targetRoomId: string) {
    if (!draggedRoomId || draggedRoomId === targetRoomId) {
      setDraggedRoomId(null)
      setDropTargetRoomId(null)
      return
    }

    const roomIds = activeRooms.map((entry) => entry.room.id)
    const fromIndex = roomIds.indexOf(draggedRoomId)
    const targetIndex = roomIds.indexOf(targetRoomId)
    if (fromIndex < 0 || targetIndex < 0) return

    roomIds.splice(fromIndex, 1)
    roomIds.splice(targetIndex, 0, draggedRoomId)
    saveRoomOrder(roomIds, draggedRoomId)
    setDraggedRoomId(null)
    setDropTargetRoomId(null)
  }

  function archiveRoom(entry: JoinedRoomSummary, archived: boolean) {
    run(
      entry.room.id,
      () => setMyRoomArchivedAction({ roomId: entry.room.id, archived }),
      archived ? "Room archived" : "Room restored",
    )
  }

  return (
    <>
      {activeRooms.length > 0 && (
        <div className="mt-6 divide-y border-y">
          {activeRooms.map((entry) => (
            <RoomRow
              key={entry.room.id}
              entry={entry}
              archived={false}
              disabled={pendingRoomId !== null}
              onArchive={(archived) => archiveRoom(entry, archived)}
              isDropTarget={dropTargetRoomId === entry.room.id && draggedRoomId !== entry.room.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", entry.room.id)
                setDraggedRoomId(entry.room.id)
              }}
              onDragEnd={() => {
                setDraggedRoomId(null)
                setDropTargetRoomId(null)
              }}
              onDragOver={(event) => {
                if (!draggedRoomId) return
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
                setDropTargetRoomId(entry.room.id)
              }}
              onDrop={(event) => {
                event.preventDefault()
                dropRoom(entry.room.id)
              }}
            />
          ))}
        </div>
      )}

      {archivedRooms.length > 0 && (
        <div className="mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => setShowArchived((current) => !current)}
            aria-expanded={showArchived}
          >
            <ArchiveIcon data-icon="inline-start" />
            Archived ({archivedRooms.length})
            <ChevronDownIcon
              data-icon="inline-end"
              className={cn("transition-transform", showArchived && "rotate-180")}
            />
          </Button>

          {showArchived && (
            <div className="mt-2 divide-y border-y">
              {archivedRooms.map((entry) => (
                <RoomRow
                  key={entry.room.id}
                  entry={entry}
                  archived
                  disabled={pendingRoomId !== null}
                  onArchive={(archived) => archiveRoom(entry, archived)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
