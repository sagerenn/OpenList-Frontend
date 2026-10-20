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
import { useFetch, useListFetch, useManageTitle, useT } from "~/hooks"
import { handleResp, notify, extApi } from "~/utils"
import { LBUploadRecord, PExtResp } from "~/types"
import { DeletePopover } from "../common/DeletePopover"

const DEFAULT_LIMIT = 200

// LBUploads is the admin uploads view for feature 4: every file uploaded
// through an LB group (header- or path-activated), newest first — where
// the client asked it to go (source path) and where it actually landed
// (target mount/path). Deleting a record removes only the metadata, not
// the stored file. Forward-compatible: all fetch/mutation failures show a
// toast, never throw.
const LBUploads = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_lb_uploads")
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
                    <DeletePopover
                      name={rec.source_path}
                      loading={deleting() === rec.id}
                      onClick={() => onDelete(rec)}
                    />
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
