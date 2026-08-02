/**
 * Google Drive photo IDs for each unit, extracted from the "Serin Rooms"
 * shared folder. Photos are served via the public Google CDN:
 *   https://lh3.googleusercontent.com/d/{FILE_ID}=s{SIZE}
 *
 * The folder is shared "Anyone with the link → Viewer", so no auth needed.
 * If a photo stops loading, the Drive share may have changed.
 */

function driveUrl(id: string, size = 1200): string {
  return `https://lh3.googleusercontent.com/d/${id}=s${size}`;
}

function driveThumb(id: string): string {
  return driveUrl(id, 600);
}

const RAW: Record<string, string[]> = {
  // ── Studio ──
  "west-1-210": [
    "1VG31wyETnAhanJlnwjh17HJKssDEyN86",
    "11dckZ3ZASqFiE2Isf308qVQswKvivo5V",
    "1C1Q_GM-qKuSe97kQnjcZ1uM4cj-ap5oO",
    "1xzC9lOL0-8J58ue3LL7wNhp4dQUcmVvE",
    "1Ij5pbRpnE3W4yYNOb0SclRW6FTy0l6FA",
    "17Ex2pTb8DS7HoiMxgeG6IB3uK5-ZOY7A",
    "1MUmgg1FMKX3W3T7Y8Fb2pvCUVyFIxnFL",
    "1F7oHV1TByVkFzzynGWl1X8__rOg6RaTo",
    "1LUC7sJzGIgE_UNMEzMgFJdzet9nSHQNN",
    "1sQ-ui4mn6QObcO9JcTbWihFV8FWOzE89",
    "1HYjlQsWvuic8PR5p95Jlb6biEioFvNCG",
    "1R1bCqMnHUnCuEYrA8xjvXaTANU7B7xj6",
  ],
  "east-1-414": [
    "1x5YXqMzeRkIo8vVEMW0SD4JWjzBeUavv",
    "11LdHTdwZOcvV_1_wll6oXh78YcwmgNY1",
    "1jPUkZvMy62_e8pDDEd-3nzr0qmubUh9z",
    "1ZZtSVu2CWEEr_jMrssuoddXCAY8bU8Nl",
    "172Ub-fjMi1Taq4c5ACs9H52yV_GU9q-c",
    "1CnxsE3fVGfgNnpO5AknaJj_77unRLMhj",
    "1k1yUEMlPeFkwMSoaWK7efROZMX_ifV5t",
    "11dfNcOoz8q7JTTlBrBJJQrABmkpjZbnY",
    "1asZtgsPLB4lJ-sxonvdNs14CGAUB5cG4",
    "1c_QtuWbrrPV6G9dZ2-UmenKI0yUVkyov",
    "1ykrqIwjMszZi-oCYhG1h360Wfb7w--Dv",
    "10pczfSh0w_mP01MiO0_BEqpZ40VOyHBl",
    "1xMPk-jmIwa6h--O-sRio0ld7VJrc7ZFY",
  ],
  "east-1-517": [
    "1O-u6ocJcNOek-mCFwrFs4JSw2Ut03icy",
    "1mg0kAMrGKnrrCJWNnlGDAii4y_6FwgDg",
    "1l2RSQwgAnw5UKI2qDEri260Hx6aAvcef",
    "15i_Z3ojMST-nPcVXQ9CJx7yXFPld_wiT",
    "1YKfMCPEBC8rplVaNiPaGEVAoqrfuCyBZ",
    "1WquNfJZX6lgb_0-8t3Yfc1RIAMmH_DAV",
    "1klTt4sjF8voUKlqTrlXKUOODiAgMEwTt",
    "1JhB3wqQw6IcsKAkio0mD8hrLLBE6liPq",
    "1ZBbf_F7WPrN4DqdGAuDuWSkeJ-5D5D-k",
    "1or5mVJZcnT1-GTPppmOWLReF9pp7mwYo",
    "1UGaHOZAlO22LDXaAD3cT3OquRSBCOpnC",
    "1jyAO6rcIqSFQXewNSrOO6vATRIRj5VhE",
  ],
  "east-2-407": [
    "18kwnVKOEn0L-GdfpTpEdSnoYXOQlABIm",
    "1wTxWSFQj_QkuNNQ7uuhF6tXd_QzDecmR",
    "1ngBawLsHlu3IXBZwVmxXY4JsRBgLVMgV",
    "1yf8btdsq2GuD9zHbvavAQ4sCfGQLUaFC",
    "1ijhlxvRdGCukWC9pcmjN-rebMWbEicWl",
    "1FfJ1sIrWPNuWmVhQwwPmPMT_giG3DuDx",
  ],

  // ── 1 Bedroom ──
  "west-1-511": [
    "1SWrZmiYdCdAho2RIATJNfGCJfMb5HsCx",
    "1IFEv4ETAxDwVhwd2hFpsUNtc48YWOJhW",
    "150fVvfywG1rdO_XuWqB8ovZzRWAA8b2Z",
    "1UsLSe38sokoTOxWpeMpWxrnxCK5xo0l0",
    "12s6MTZLNzlZ2lIlVhMaMfKTliL77R4rr",
    "1HDscw6NSSNqfWUTkH2PHbtL_DnGXGUob",
    "112PLrma6pIHYzYb0CRxjxU7mS0l_m5q8",
    "1DVtWvfw9TcvLVtrsyyLPWaQKFobeShzz",
    "1sXAylq30UAKmmB7gAEPgXInqKgUywgDp",
    "1Letw-oRr60ID9PPzQOsXw-BpCcuFpgGi",
    "1vt_ILVIX6VU7I0MSfqfSOJ0naMO6TWic",
    "1ygpyHii1jKC3BpPiyQjfapy46-TX6CyQ",
  ],
  "west-2-420": [
    "1YGycbcDGQJgoeaGOp3EimOKybWtGBXkx",
    "1-4ifa664pdBE_8UK2BEwdEhKUw8m5a7M",
    "1A3eddPokuT5x-Iq-jkc8n3ZZp7Asukx3",
    "1dkADWohSFdRYj3AtgWapS5s-mbDt4njz",
    "1JLoAsuCwvUE_bS3wKRNWgdCJq2_C0eTf",
    "1BGk6eFUTFRSDxZq5_wvwU9hy82BZ4EQO",
    "1MIJAa2EukfB2wzgXFyXGzFw6mCsXuj-H",
    "14n2yNlaqykTUqvhye797wiXBOZBR9iKE",
    "1wTjqFp0bl0xvdWr39T0hL4KFNxcY4L1_",
    "1dE3D_IXkko18uuGwq1uBrFsjCMPescwv",
    "1O9dbgOXbsHjVBDDCYAVyYFfECAczYs1j",
    "15JC9TKDPch-fm3ihj9A4uoIAdzrk_we_",
  ],
  "east-2-726": [
    "15y7XbKerIzFpsU3HlW0GXGT_zgMVDCt9",
    "1My7X52Zzw6pRpKkSiQy1AmEZti2IGw-S",
    "1ZmV3qAdnn9rikbyyeX_9wehChpYYt83F",
    "1mZTc3--tPXItu6leTxSWEJD2VYggfcxz",
    "1BncKK2vypytHKan2XPvRRyTe7JANk28E",
    "14ZwXso9mifzJACm53fmWP5JEm10qQTd5",
    "10Y4Sg4VuEcv3uQ5vDaa7z6l_872V5jRQ",
    "1Oy-cGsISsf0MI0ylqETfVQ3rdIdwWwj6",
    "1cldi5fRWoWi2z5vH28zHR2T2H8XiQsV0",
    "1LavzefN6IblmHGceQSvBAaf4LaFdTz9G",
    "1E_kdyW0gtZNQxuoOvYQniWu0Vlnda7RP",
    "11E8DCS-aY--0B57sOCFcjHGVsmYlqLnb",
  ],
  "west-2-1407": [
    "1a_gWfhs8p9dRByoHV2jPU_m0XudOhTTr",
    "1cqiAcpuUIvDfdBsfYaRTf2et5O9ZGDA9",
    "1O0PZp42RpFk0zsajioTqMz3niSmFcZah",
    "1lzVRTUbhxM3kQLHiHy0cx7WjmTJRXtGn",
    "1v1dJXU3Wnrbq5t3oDEOK-hox9FH_d6gw",
    "1x-iGO7OzMUGKrJkAIDNFcb2QDH0VkNlJ",
    "1PpRauvnoFpIr1FbMFXj1BqYleyf3tIjz",
    "1aWUCG4vpF0NIK2S1DpMQy9DzujRW5Tzi",
    "1e9H5C3HVs52WuBcaXoX4c9WLLmYkoHnE",
    "1AIsb6b8PwkwtzKGuT4oGKjAVJ3cVUbTV",
    "1w1S_i_wrUq0Aavq_TzOZz8V_2O5E8j34",
    "15Y84oMrqkbh8Q3Cpy14PMjpmRJk6ZwyO",
  ],

  // ── 2 Bedroom ──
  "west-2-201": [
    "18vZGUDrBWp4TW6txB_juPEL06hE6K57-",
    "1GpeH1zHE8msz8IRVCL-1llHioCXDx6S1",
    "1Uy7xbV2zC9rjxAF6nSVoRJ5PYmdBgVYm",
    "1CmiyNA6cmNVgAiG4x1NhBMtmSg0iGDcu",
    "1yu_lGAAsdusR2GFVLO1I0WTKhAOFBnhW",
    "1ipEm300i0HO80tL-33PNo4tCetMfAlLk",
    "1AH9Pk9raGD-NY0qwaVsTwadR3EkBnbw6",
    "18fKYBLoo6sDRlQs1gx5Wnu1Mb0hav2Rj",
    "1p6g5Itxp0lgBAyw-wRkNxwuWas_AAhzu",
    "11VfoSoJtsQKavLs8UGQlAPdp-zaaLWZW",
    "1gKfct301AbzIQZnhddJRzq6vtA_5lHCm",
    "1iotxLWwq8tvGCbX4qgZZVLiHYgXI2BEm",
  ],
  "west-2-919": [
    "1Z0Xah6SYLqA00Hv_4ol-8Db-Cc5ndbEW",
    "1zGw3yQlfVC-wIaw7rwYuc8n6QVUDM-GM",
    "16q99bPdBq2BxENWg53X4SkgRc_6iWm9k",
    "1_82_AyZf5xDn1aTmSXhdGIy3wEJ1T_ll",
    "1UohZYGNKWiTrjvfMM8ZqXyFgBDdfZihu",
    "1jCowj5G9stnZ6YzGw700Jj4b82NacMWS",
    "1PH5nRmJbn33rauuOQzYQ3214fixDvAgt",
    "1GGoNr8qC0fD2QhkQPFxmO4w_rg6y-bcV",
    "16hJOgBkotySG2hYDtOggrWftzEZElZAv",
    "1Mu7lRfMZbUWRo_Hv1J5BOfxuS3835j6U",
    "1JwkjTDfLFDGTAi-R6AWJLr5-nEa78qBe",
    "1ZHhEu1da7A7KvJcS5S_iG9htEWrlnkOu",
  ],

  // ── Executive Studio ──
  "east-1-220": [
    "1qBXcfl8JGRgfSy2Iot4aeYbuWlqLCXjC",
    "1f8xqvbYV7_U5zWytdCI-TKSDR3E9qG3B",
    "13YO8av2XCgp1ZEA_yyrqdo1xqCYfkTGy",
    "1uzV0EmwLZLYn_KJyGeQGpuTC7ldNqnPA",
    "1EChUrmYEkbFYPzP8GHbLDLbWEFBlYImK",
    "1PrtFRSspGcOyUh1TM8e1GEYBaFSkKrRK",
    "1jr3ZqYMGo5-K0HIvyNSidCy33HiHTbmK",
    "1Lr-91M_OhPqgQKkzcTmAwFzn4HduFBeC",
    "1O6Ay_1pvoUXW17EGb6HQMJ-YjYUu5yDc",
    "1dkqZn0ViXPKAsiw1aVStQEhQrEbPfM_9",
    "1OmtWhba_fUATfw-NzKP_LtXkbhSNo1JV",
    "1QQECvgRS2wHtUZY8U8oroNKItZCY-8-e",
  ],
  "west-1-517": [
    "1pziyW403F4p80SkeZ1HIIX7PWvxSUSsA",
    "1uyP_EgVaXjA-aMEiOPS2Trh4Q8lZ6UtS",
    "13GKAZp2_vjtEDzBkx6fKMCMjK8YwNE6P",
    "1-M5qceSXQaswAiP0z63eYl3D9W8lC2KV",
    "1CLgCfZIDlzJU-IDwYhZZSEVrFtA77V80",
    "1JeGfa9nIbUQ_eikz208qucVvVynPo6_g",
    "1Oq3fFr4FH-_R5Kd87Leoq6eBlrLCLJ9T",
    "1s9-YzJ6hUQYCaANCCzvHsyQ-CYHL6XF9",
    "1JEjxZiEYfmdC3V5-Aqdu5BcqMQsTzXrM",
    "1o9r1kBA24B7rALGHFIa2QLbP9-DTqnGp",
    "1U1XOW1asZmiJ0r0so_pmy9hUQm6VZ3Fl",
    "12ICo6-c9tr_44uCayqF2X5-bABzcYX6P",
  ],
  "west-1-605": [
    "1aZpmQdrz60FKq2vIJyLELvq0UpD5dDYi",
    "1h3XxYIdapfCncdsswRMoCsrA-zUsNj2R",
    "1BrNzPpsiNRowF1tzW8r9tBLbkYgL5U-e",
    "1hIciOpX9KuSAOJ19XmbkGrE8rXp_KiJS",
    "1pGgZ3ncTx_cpNkF-BFGI73ALeva0socH",
    "1o5QeZRbEgLqrjkq4ZbUfHr8SQEFoy_fb",
    "1l9ZTXcdTzWFUcBmTlmouspS2nM0OYYD2",
    "1WUdvJ-_paABClHYKNw2kF5t4G0xky5q0",
    "1ZZZ2wZmYUv7wff3yg8ccSEruICxu5keM",
    "1mEgtQn-VfEKsEfg__C-TM8o3SPC5TmP8",
    "1JS1nq3VZyowQTXnyuRCbY2X0zwLNKW_F",
    "1dBbfwCvdo7OHU1LgXymOVyoOizMrFeKm",
  ],
  "west-1-906": [
    "1IRtoZbhiEJiamLMG1fVAhChKoIvpslhj",
    "1IP7j77477Wi_BmTv0U7rOXlyFw98ppu9",
    "1p0dVnNxT6F1Y66cakYBbc7sgEuriOg81",
    "1OTUseJgI6UfyjjJdEJ6hSc7TlneMN0V9",
    "1S2EJAGj8iUQTOw2ibQgJ1ZtoW0xyAntA",
    "1uuUQon8pFABGezjmTQDRnJ9U-x47NO5L",
    "1DLMepYnajyXLPUpdO3B-e9rITgnqCNE0",
    "1tUHGTwdGuTypecwEqkuZGo71LWmsmoy8",
    "1qhwm_uAY7qSzU2ZFDt8u-wSUAGJKpw5I",
    "1__zGtTYw6DihcC8IivFbuQIV1pmxJUY7",
    "1df6hryOOc5MkjyDLauK52kd1T6-RlRAF",
    "1B6B40rSebBMq7VihBw7yOR60ZCr2fCkz",
  ],
};

export interface UnitPhoto {
  url: string;
  thumb: string;
}

export function getUnitPhotos(unitId: string): UnitPhoto[] {
  const ids = RAW[unitId];
  if (!ids) return [];
  return ids.map((id) => ({ url: driveUrl(id), thumb: driveThumb(id) }));
}

export function getUnitCover(unitId: string): string | null {
  const ids = RAW[unitId];
  if (!ids || ids.length === 0) return null;
  return driveUrl(ids[0]!, 800);
}

export function getUnitCoverThumb(unitId: string): string | null {
  const ids = RAW[unitId];
  if (!ids || ids.length === 0) return null;
  return driveThumb(ids[0]!);
}

export function hasPhotos(unitId: string): boolean {
  return (RAW[unitId]?.length ?? 0) > 0;
}
