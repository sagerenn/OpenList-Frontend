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
import { createSignal, For } from "solid-js"
import { useFetch, useListFetch, useManageTitle, useT } from "~/hooks"
import { handleResp, notify, extApi } from "~/utils"
import { DomainBinding, PExtResp } from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { UserPicker } from "./UserPicker"

// Domain is the config page for feature 1 (per-user domain routing). An
// admin binds a host to a user so requests with that Host header resolve to
// that user and per-user policy applies. Lists the user's current bindings
// and allows bind/unbind.
const Domain = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_domain")
  const [userId, setUserId] = createSignal<number | undefined>(undefined)
  const [host, setHost] = createSignal("")
  const [domains, setDomains] = createSignal<DomainBinding[]>([])

  const [listLoading, listDomains] = useFetch(
    (uid: number): PExtResp<DomainBinding[]> => extApi.get(`/domain/${uid}`),
  )
  const [binding, bindDomain] = useFetch(
    (body: DomainBinding): PExtResp<null> => extApi.post("/domain", body),
  )
  const [unbindingHost, unbindDomain] = useListFetch(
    (h: string): PExtResp<null> =>
      extApi.delete(`/domain?host=${encodeURIComponent(h)}`),
  )

  const refresh = async () => {
    const uid = userId()
    if (uid === undefined) return
    const resp = await listDomains(uid)
    handleResp(resp, (data) => setDomains(data), undefined, true, false)
  }

  const onBind = async () => {
    const uid = userId()
    if (uid === undefined) {
      notify.error(t("ext.select_user"))
      return
    }
    if (host() === "") {
      notify.error(t("ext.host"))
      return
    }
    const resp = await bindDomain({ user_id: uid, host: host() })
    handleResp(resp, () => {
      notify.success(t("global.save_success"))
      setHost("")
      refresh()
    })
  }

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2" w="$full" alignItems="end" flexWrap="wrap">
        <Box minW="$48">
          <UserPicker
            value={userId()}
            onChange={(uid) => {
              setUserId(uid)
            }}
          />
        </Box>
        <Input
          placeholder={t("ext.host_placeholder")}
          value={host()}
          onInput={(e) => setHost(e.currentTarget.value)}
          w="$48"
        />
        <Button colorScheme="accent" onClick={onBind} loading={binding()}>
          {t("ext.bind")}
        </Button>
        <Button
          onClick={refresh}
          loading={listLoading()}
          disabled={userId() === undefined}
        >
          {t("global.refresh")}
        </Button>
      </HStack>

      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("ext.host")}</Th>
              <Th>{t("ext.user_id")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For
              each={domains()}
              fallback={
                <Tr>
                  <Td>{t("ext.no_domains")}</Td>
                </Tr>
              }
            >
              {(d) => (
                <Tr>
                  <Td>
                    <Badge colorScheme="info">{d.host}</Badge>
                  </Td>
                  <Td>{d.user_id}</Td>
                  <Td>
                    <DeletePopover
                      name={d.host}
                      loading={unbindingHost() === d.host}
                      onClick={async () => {
                        const resp = await unbindDomain(d.host)
                        handleResp(resp, () => {
                          notify.success(t("global.delete_success"))
                          refresh()
                        })
                      }}
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

export default Domain
