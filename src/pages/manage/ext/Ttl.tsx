import {
  Box,
  Button,
  Checkbox,
  HStack,
  Input,
  Radio,
  RadioGroup,
  VStack,
} from "@hope-ui/solid"
import { createSignal, Show } from "solid-js"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { handleResp, notify, extApi } from "~/utils"
import { TTLConfig, TTLMode, PExtResp } from "~/types"
import { UserPicker } from "./UserPicker"

// Ttl is the config page for feature 2 (per-user file TTL with auto-delete).
// An admin enables TTL per user, chooses fixed-time or sliding-access-window
// expiry, and sets the duration. A "sweep now" button triggers one reaper
// pass. Forward-compatible: load/save failures show a toast, never throw.
const Ttl = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.ext_ttl")
  const [userId, setUserId] = createSignal<number | undefined>(undefined)
  const [enabled, setEnabled] = createSignal(false)
  const [mode, setMode] = createSignal<TTLMode>("fixed")
  const [duration, setDuration] = createSignal(3600)
  const [loaded, setLoaded] = createSignal(false)

  const [getLoading, getTTL] = useFetch((uid: number): PExtResp<TTLConfig> =>
    extApi.get(`/ttl/${uid}`),
  )
  const [saving, saveTTL] = useFetch(
    (uid: number, body: TTLConfig): PExtResp<null> =>
      extApi.put(`/ttl/${uid}`, body),
  )
  const [sweeping, sweep] = useFetch((): PExtResp<{ deleted: number }> =>
    extApi.post("/ttl/sweep"),
  )

  const load = async () => {
    const uid = userId()
    if (uid === undefined) return
    setLoaded(false)
    const resp = await getTTL(uid)
    handleResp(
      resp,
      (data) => {
        setEnabled(data.enabled)
        setMode((data.mode || "fixed") as TTLMode)
        setDuration(data.duration_seconds || 3600)
        setLoaded(true)
      },
      undefined,
      true,
      false,
    )
  }

  const onSave = async () => {
    const uid = userId()
    if (uid === undefined) {
      notify.error(t("ext.select_user"))
      return
    }
    const body: TTLConfig = {
      user_id: uid,
      enabled: enabled(),
      mode: mode(),
      duration_seconds: duration(),
    }
    const resp = await saveTTL(uid, body)
    handleResp(resp, () => notify.success(t("global.save_success")))
  }

  const onSweep = async () => {
    const resp = await sweep()
    handleResp(resp, (data) =>
      notify.success(t("ext.ttl.sweep_success", { count: data.deleted })),
    )
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
        <Button
          onClick={load}
          loading={getLoading()}
          disabled={userId() === undefined}
        >
          {t("global.refresh")}
        </Button>
        <Button colorScheme="accent" onClick={onSweep} loading={sweeping()}>
          {t("ext.ttl.sweep")}
        </Button>
      </HStack>

      <Show when={loaded()}>
        <VStack spacing="$3" alignItems="start" w="$full" p="$2">
          <Checkbox
            checked={enabled()}
            onChange={(e: any) => setEnabled(e.currentTarget.checked)}
          >
            {t("ext.ttl.enabled")}
          </Checkbox>
          <Box>
            <Box mb="$1">{t("ext.ttl.mode")}</Box>
            <RadioGroup
              value={mode()}
              onChange={(v: any) => setMode(v as TTLMode)}
            >
              <HStack spacing="$4">
                <Radio value="fixed">{t("ext.ttl.mode_fixed")}</Radio>
                <Radio value="access">{t("ext.ttl.mode_access")}</Radio>
              </HStack>
            </RadioGroup>
          </Box>
          <Box>
            <Box mb="$1">{t("ext.ttl.duration")}</Box>
            <Input
              type="number"
              min={1}
              value={duration()}
              onInput={(e) => setDuration(Number(e.currentTarget.value) || 0)}
              w="$48"
            />
          </Box>
          <Button colorScheme="accent" onClick={onSave} loading={saving()}>
            {t("ext.ttl.save")}
          </Button>
        </VStack>
      </Show>
    </VStack>
  )
}

export default Ttl
