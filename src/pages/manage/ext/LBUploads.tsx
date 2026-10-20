import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, onMount } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { useFetch, useListFetch, useManageTitle, useT } from "~/hooks"
import { handleResp, notify, encodePath, extApi } from "~/utils"
import { LBUploadRecord, PExtResp } from "~/types"
import { DeletePopover } from "../common/DeletePopover"

const DEFAULT_LIMIT = 200

// LBUploads is the admin uploads view for feature 4: every file uploaded
// through an LB group (header- or path-activated), newest first — where
// the client asked it to go (source path) and where it actually landed
// (target mount/path). "View" jumps the file manager to the folder that
// holds the stored file, so an admin can browse, preview, and download it;
// deleting a record removes only the metadata, not the stored file.
// Forward-compatible: all fetch/mutation failures show a toast, never
// throw.
const LBUploads = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_lb_uploads")
  const navigate = useNavigate()
  const [filter, setFilter] = createSignal("")
  const [uploads, setUploads] = createSignal<LBUploadRecord[]>([])
  const [loaded, setLoaded] = createSignal(false)

  const [listLoading, listUploads] = useFetch(
    (query: string): PExtResp<LBUploadRecord[]> =>
      extApi.get(`/lb/uploads${query}`),
  )
  const [deleting, deleteRecord] = useListFetch((id: number): PExtResp<null> =>
    extApi.delete(`/lb/uploads/${id}`),
  )

  const refresh = async () => {
    const uid = filter().trim()
    const query =
      uid === ""
        ? `?limit=${DEFAULT_LIMIT}`
        : `?user_id=${uid}&limit=${DEFAULT_LIMIT}`
    const resp = await listUploads(query)
    handleResp(resp, (data) => {
      setUploads(data)
      setLoaded(true)
    })
  }

  const onDelete = async (rec: LBUploadRecord) => {
    const resp = await deleteRecord(rec.id)
    handleResp(resp, () => {
      notify.success(t("global.delete_success"))
      refresh()
    })
  }

  // Jump the file manager (the app's catch-all route) to the folder that
  // physically holds the file, so the record is browsable, previewable,
  // and downloadable straight from this table. Falls back to the target
  // mount when the record carries no target path.
  const onView = (rec: LBUploadRecord) => {
    let dir = rec.target_mount ?? ""
    if (rec.target_path) {
      const idx = rec.target_path.lastIndexOf("/")
      if (idx > 0) {
        dir = rec.target_path.slice(0, idx)
      }
    }
    navigate(encodePath(dir || "/") || "/")
  }

  // Load the newest records on mount: the table should not wait for an
  // explicit Refresh click (same behavior as the other extension pages
  // after their triggering action).
  onMount(() => void refresh())

  return (
    <VStack spacing="$3" alignItems="start" w="$full">
      <HStack spacing="$2" w="$full" alignItems="end" flexWrap="wrap">
        <Box>
          <Box mb="$1">{t("ext.lb_uploads.filter_user")}</Box>
          <Input
            placeholder={t("ext.lb_uploads.filter_user_placeholder")}
            value={filter()}
            onInput={(e) => setFilter(e.currentTarget.value)}
            w="$48"
          />
        </Box>
        <Button onClick={refresh} loading={listLoading()}>
          {t("global.refresh")}
        </Button>
      </HStack>

      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("ext.lb_uploads.time")}</Th>
              <Th>{t("ext.lb_uploads.user")}</Th>
              <Th>{t("ext.lb_uploads.group")}</Th>
              <Th>{t("ext.lb_uploads.source_path")}</Th>
              <Th>{t("ext.lb_uploads.target")}</Th>
              <Th>{t("ext.lb_uploads.size")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For
              each={uploads()}
              fallback={
                <Tr>
                  <Td>{loaded() ? t("ext.lb_uploads.no_uploads") : ""}</Td>
                </Tr>
              }
            >
              {(rec) => (
                <Tr>
                  <Td>{new Date(rec.created_at).toLocaleString()}</Td>
                  <Td>{rec.user_id}</Td>
                  <Td>
                    <Badge colorScheme="info">{rec.group_name}</Badge>
                  </Td>
                  <Td>{rec.source_path}</Td>
                  <Td>
                    <Badge colorScheme="neutral">{rec.target_mount}</Badge>
                    {rec.target_path}
                  </Td>
                  <Td>{rec.size}</Td>
                  <Td>
                    <HStack spacing="$1">
                      <Button
                        size="sm"
                        colorScheme="info"
                        variant="ghost"
                        onClick={() => onView(rec)}
                      >
                        {t("ext.lb_uploads.view_file")}
                      </Button>
                      <DeletePopover
                        name={rec.source_path}
                        loading={deleting() === rec.id}
                        onClick={() => onDelete(rec)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default LBUploads
