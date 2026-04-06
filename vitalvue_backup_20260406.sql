--
-- PostgreSQL database dump
--

-- Dumped from database version 15.5
-- Dumped by pg_dump version 15.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: vitalvue_admin
--

CREATE TYPE public.userrole AS ENUM (
    'PATIENT',
    'NURSE',
    'DOCTOR',
    'ORG_ADMIN',
    'MASTER_ADMIN'
);


ALTER TYPE public.userrole OWNER TO vitalvue_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actions; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.actions (
    id integer NOT NULL,
    alert_id integer,
    patient_id integer,
    staff_id integer,
    action_type character varying,
    other_details text,
    performed_at timestamp without time zone,
    created_at timestamp without time zone
);


ALTER TABLE public.actions OWNER TO vitalvue_admin;

--
-- Name: actions_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.actions_id_seq OWNER TO vitalvue_admin;

--
-- Name: actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.actions_id_seq OWNED BY public.actions.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO vitalvue_admin;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    patient_id integer,
    vital_type character varying,
    triggered_value character varying,
    status character varying,
    severity character varying,
    is_flagged boolean,
    flagged_doctor_id integer,
    created_at timestamp without time zone,
    ward_id integer
);


ALTER TABLE public.alerts OWNER TO vitalvue_admin;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.alerts_id_seq OWNER TO vitalvue_admin;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: clinical_notes; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.clinical_notes (
    id integer NOT NULL,
    patient_id integer,
    author_id integer,
    event_type character varying,
    note_content text,
    is_flagged_for_review boolean,
    event_timestamp timestamp without time zone,
    created_at timestamp without time zone
);


ALTER TABLE public.clinical_notes OWNER TO vitalvue_admin;

--
-- Name: clinical_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.clinical_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clinical_notes_id_seq OWNER TO vitalvue_admin;

--
-- Name: clinical_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.clinical_notes_id_seq OWNED BY public.clinical_notes.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    organization_id integer NOT NULL
);


ALTER TABLE public.departments OWNER TO vitalvue_admin;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.departments_id_seq OWNER TO vitalvue_admin;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.doctors (
    id integer NOT NULL,
    specialization character varying(100) NOT NULL
);


ALTER TABLE public.doctors OWNER TO vitalvue_admin;

--
-- Name: master_admins; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.master_admins (
    id integer NOT NULL,
    super_level integer NOT NULL
);


ALTER TABLE public.master_admins OWNER TO vitalvue_admin;

--
-- Name: nurses; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.nurses (
    id integer NOT NULL,
    license_no character varying(50) NOT NULL
);


ALTER TABLE public.nurses OWNER TO vitalvue_admin;

--
-- Name: org_admins; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.org_admins (
    id integer NOT NULL,
    organization_name character varying(255) NOT NULL
);


ALTER TABLE public.org_admins OWNER TO vitalvue_admin;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    country character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    city character varying(100) NOT NULL
);


ALTER TABLE public.organizations OWNER TO vitalvue_admin;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_id_seq OWNER TO vitalvue_admin;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    blood_group character varying(10) NOT NULL,
    age integer NOT NULL,
    gender character varying(20) NOT NULL,
    height double precision,
    weight double precision,
    alt_phone character varying(20),
    device_id character varying(100) NOT NULL,
    doctor_id integer,
    room_id integer NOT NULL,
    nurse_id integer
);


ALTER TABLE public.patients OWNER TO vitalvue_admin;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    room_number character varying(50) NOT NULL,
    is_occupied boolean NOT NULL,
    ward_id integer NOT NULL
);


ALTER TABLE public.rooms OWNER TO vitalvue_admin;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rooms_id_seq OWNER TO vitalvue_admin;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.users (
    id integer NOT NULL,
    role public.userrole NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    user_type character varying(50) NOT NULL,
    user_id character varying(50) NOT NULL,
    organization_id integer,
    phone_number character varying(20) NOT NULL,
    full_name character varying(255) NOT NULL
);


ALTER TABLE public.users OWNER TO vitalvue_admin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO vitalvue_admin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vitals; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.vitals (
    id integer NOT NULL,
    patient_id integer,
    device_id character varying,
    heart_rate integer,
    spo2 double precision,
    temp double precision,
    bp_systolic integer,
    bp_diastolic integer,
    news2_score integer,
    af_warning character varying,
    stroke_risk character varying,
    seizure_risk character varying,
    hrv_score integer,
    stress_level character varying,
    movement integer,
    sleep_pattern character varying,
    battery_percent integer,
    is_connected boolean,
    is_removed boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.vitals OWNER TO vitalvue_admin;

--
-- Name: vitals_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.vitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vitals_id_seq OWNER TO vitalvue_admin;

--
-- Name: vitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.vitals_id_seq OWNED BY public.vitals.id;


--
-- Name: wards; Type: TABLE; Schema: public; Owner: vitalvue_admin
--

CREATE TABLE public.wards (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    department_id integer NOT NULL
);


ALTER TABLE public.wards OWNER TO vitalvue_admin;

--
-- Name: wards_id_seq; Type: SEQUENCE; Schema: public; Owner: vitalvue_admin
--

CREATE SEQUENCE public.wards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wards_id_seq OWNER TO vitalvue_admin;

--
-- Name: wards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: vitalvue_admin
--

ALTER SEQUENCE public.wards_id_seq OWNED BY public.wards.id;


--
-- Name: actions id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.actions ALTER COLUMN id SET DEFAULT nextval('public.actions_id_seq'::regclass);


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: clinical_notes id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.clinical_notes ALTER COLUMN id SET DEFAULT nextval('public.clinical_notes_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vitals id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.vitals ALTER COLUMN id SET DEFAULT nextval('public.vitals_id_seq'::regclass);


--
-- Name: wards id; Type: DEFAULT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.wards ALTER COLUMN id SET DEFAULT nextval('public.wards_id_seq'::regclass);


--
-- Data for Name: actions; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.actions (id, alert_id, patient_id, staff_id, action_type, other_details, performed_at, created_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.alembic_version (version_num) FROM stdin;
53265ace6eee
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.alerts (id, patient_id, vital_type, triggered_value, status, severity, is_flagged, flagged_doctor_id, created_at, ward_id) FROM stdin;
1	9	SpO2	88.43811501037706%	active	critical	f	\N	2026-04-01 07:11:26.545118	\N
2	9	SpO2	89.60875476607515%	active	critical	f	\N	2026-04-01 07:11:36.643947	\N
3	9	SpO2	88.92633614784029%	active	critical	f	\N	2026-04-01 07:11:44.735796	\N
4	9	SpO2	88.55675792249328%	active	critical	f	\N	2026-04-01 07:11:52.825791	\N
5	9	SpO2	89.92905799952014%	active	critical	f	\N	2026-04-01 07:11:54.85056	\N
6	9	SpO2	88.09435476669572%	active	critical	f	\N	2026-04-01 07:11:56.87395	\N
7	9	SpO2	88.26499778127518%	active	critical	f	\N	2026-04-01 07:19:28.255471	\N
8	9	SpO2	88.23733944270974%	active	critical	f	\N	2026-04-01 07:59:46.38525	\N
9	9	SpO2	88.21983337344525%	active	critical	f	\N	2026-04-01 08:01:29.290704	\N
10	9	SpO2	88.680868060856%	active	critical	f	\N	2026-04-01 08:01:31.317699	\N
11	9	SpO2	89.79611102730985%	active	critical	f	\N	2026-04-01 08:01:43.42825	\N
12	9	SpO2	88.97670431209204%	active	critical	f	\N	2026-04-01 08:01:47.457247	\N
13	9	SpO2	89.91853578842303%	active	critical	f	\N	2026-04-01 08:01:49.468345	\N
14	9	SpO2	88.69855524471677%	active	critical	f	\N	2026-04-01 08:02:05.631225	\N
15	9	SpO2	89.91339751554972%	active	critical	f	\N	2026-04-01 08:13:20.709231	\N
16	9	SpO2	89.44484353835898%	active	critical	f	\N	2026-04-01 08:13:24.758543	\N
17	9	SpO2	89.3701626485365%	active	critical	f	\N	2026-04-01 08:13:42.946943	\N
18	9	SpO2	89.5525958177148%	active	critical	f	\N	2026-04-01 15:39:25.007193	\N
19	9	SpO2	88.825967395931%	active	critical	f	\N	2026-04-01 15:39:33.093184	\N
20	9	SpO2	89.16035220485608%	active	critical	f	\N	2026-04-01 15:39:35.111252	\N
21	9	SpO2	89.29861522613994%	active	critical	f	\N	2026-04-01 15:39:37.127186	\N
22	9	SpO2	89.6445486498509%	active	critical	f	\N	2026-04-01 15:41:14.574607	\N
23	9	SpO2	89.91071592513588%	active	critical	f	\N	2026-04-01 15:41:40.845156	\N
24	9	SpO2	89.3383420430102%	active	critical	f	\N	2026-04-01 15:41:59.041636	\N
25	9	SpO2	89.86152757627684%	active	critical	f	\N	2026-04-01 15:42:09.125502	\N
26	9	SpO2	89.60645031055778%	active	critical	f	\N	2026-04-01 15:42:13.158843	\N
27	9	SpO2	88.64559936070232%	active	critical	f	\N	2026-04-01 15:42:15.174331	\N
28	9	SpO2	89.16379524997525%	active	critical	f	\N	2026-04-01 15:42:25.277326	\N
29	9	SpO2	89.88251330340273%	active	critical	f	\N	2026-04-01 15:42:39.435738	\N
30	9	SpO2	88.15730758714055%	active	critical	f	\N	2026-04-01 15:42:43.478144	\N
31	9	SpO2	88.10821932791471%	active	critical	f	\N	2026-04-01 15:42:47.520148	\N
\.


--
-- Data for Name: clinical_notes; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.clinical_notes (id, patient_id, author_id, event_type, note_content, is_flagged_for_review, event_timestamp, created_at) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.departments (id, name, organization_id) FROM stdin;
1	ICU	1
2	Emergency Room	1
3	Cardiology	1
\.


--
-- Data for Name: doctors; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.doctors (id, specialization) FROM stdin;
1	Liver
\.


--
-- Data for Name: master_admins; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.master_admins (id, super_level) FROM stdin;
\.


--
-- Data for Name: nurses; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.nurses (id, license_no) FROM stdin;
10	Ajay Poly
\.


--
-- Data for Name: org_admins; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.org_admins (id, organization_name) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.organizations (id, name, country, state, city) FROM stdin;
1	Apollo	India	Kerala	Kochi
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.patients (id, blood_group, age, gender, height, weight, alt_phone, device_id, doctor_id, room_id, nurse_id) FROM stdin;
9	b-	27	Male	166	75.5	+919747181728	DEV-001	1	1	10
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.rooms (id, room_number, is_occupied, ward_id) FROM stdin;
2	101	f	1
3	102	f	1
1	100	t	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.users (id, role, is_active, created_at, user_type, user_id, organization_id, phone_number, full_name) FROM stdin;
10	NURSE	t	2026-04-01 05:34:26.308502	nurse	NUR-001	1	+917902687121	Ajay Poly
1	DOCTOR	t	2026-03-20 08:34:38.178871	doctor	DOC-001	1	+917907268722	Dr. George Thomas
9	PATIENT	t	2026-04-01 05:34:26.308502	patient	PAT-001	1	+918301857621	Jibin George
\.


--
-- Data for Name: vitals; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.vitals (id, patient_id, device_id, heart_rate, spo2, temp, bp_systolic, bp_diastolic, news2_score, af_warning, stroke_risk, seizure_risk, hrv_score, stress_level, movement, sleep_pattern, battery_percent, is_connected, is_removed, created_at) FROM stdin;
1	9	BAND-001	123	92.67055201335639	38.28462792956838	110	85	0	Detected	Low	Low	46	Moderate	5	6h 30m	85	t	f	2026-04-01 07:07:41.963858
2	9	BAND-001	88	97.5488517148375	36.61496564916475	150	98	0	Normal	Low	Low	49	High	3	6h 30m	85	t	f	2026-04-01 07:07:43.984486
3	9	BAND-001	95	91.31334222869272	37.87076304698516	128	83	0	Normal	Low	Low	33	High	3	6h 30m	85	t	f	2026-04-01 07:07:48.035203
4	9	BAND-001	87	96.4331334131206	38.94468968904738	132	110	0	Normal	Low	Low	33	High	5	6h 30m	85	t	f	2026-04-01 07:11:20.487148
5	9	BAND-001	141	98.16632666841868	36.85459376875653	124	74	3	Detected	Low	Low	49	High	4	6h 30m	85	t	f	2026-04-01 07:11:22.506292
6	9	BAND-001	119	93.11382315308413	36.81041045873993	128	86	0	Normal	Low	Low	49	High	2	6h 30m	85	t	f	2026-04-01 07:11:24.521948
7	9	BAND-001	124	88.43811501037706	36.53405939579427	136	82	3	Detected	Low	Low	57	Low	5	6h 30m	85	t	f	2026-04-01 07:11:26.548975
8	9	BAND-001	126	98.21205347317442	38.924049007696546	168	92	0	Detected	High	Low	50	Low	8	6h 30m	85	t	f	2026-04-01 07:11:28.566214
9	9	BAND-001	120	92.80220997593602	37.809742329522464	110	89	0	Detected	Low	Low	44	High	5	6h 30m	85	t	f	2026-04-01 07:11:30.583106
10	9	BAND-001	100	97.96470080565763	37.10728834673994	120	83	0	Normal	Low	Low	54	Low	1	6h 30m	85	t	f	2026-04-01 07:11:32.603633
11	9	BAND-001	126	94.12388063028737	37.92727826049359	171	104	0	Detected	High	Low	39	Low	3	6h 30m	85	t	f	2026-04-01 07:11:34.624259
12	9	BAND-001	87	89.60875476607515	38.0164334607674	132	109	3	Normal	Low	Low	40	Low	3	6h 30m	85	t	f	2026-04-01 07:11:36.644999
13	9	BAND-001	103	92.640293626213	37.461932929517204	166	70	0	Normal	Low	Low	46	High	7	6h 30m	85	t	f	2026-04-01 07:11:38.662443
14	9	BAND-001	140	91.88351932464047	36.6855327833778	170	109	3	Detected	High	Low	31	Moderate	6	6h 30m	85	t	f	2026-04-01 07:11:40.686947
15	9	BAND-001	138	95.29214998055868	38.13002334863299	164	92	3	Detected	High	Low	52	Moderate	2	6h 30m	85	t	f	2026-04-01 07:11:42.711386
16	9	BAND-001	82	88.92633614784029	37.905478060298606	128	85	3	Normal	Low	Low	34	Low	2	6h 30m	85	t	f	2026-04-01 07:11:44.739878
17	9	BAND-001	114	95.04826806282188	37.62377184896456	139	84	0	Normal	Low	Low	36	Low	7	6h 30m	85	t	f	2026-04-01 07:11:46.763026
18	9	BAND-001	108	97.49304426420522	38.74874681784132	121	94	0	Normal	Low	Low	33	Low	4	6h 30m	85	t	f	2026-04-01 07:11:48.786113
19	9	BAND-001	136	91.24039758526247	38.89792144259719	143	108	3	Detected	Low	Low	30	Low	7	6h 30m	85	t	f	2026-04-01 07:11:50.803404
20	9	BAND-001	79	88.55675792249328	38.148023755207795	171	107	3	Normal	Low	Low	56	High	5	6h 30m	85	t	f	2026-04-01 07:11:52.826906
21	9	BAND-001	79	89.92905799952014	37.92565361028723	151	96	3	Normal	Low	Low	30	Moderate	9	6h 30m	85	t	f	2026-04-01 07:11:54.851598
22	9	BAND-001	86	88.09435476669572	37.12932915808327	117	104	3	Normal	Low	Low	59	Moderate	8	6h 30m	85	t	f	2026-04-01 07:11:56.875197
23	9	BAND-001	97	93.75069125213673	38.78418353448292	131	102	0	Normal	Low	Low	30	Moderate	1	6h 30m	85	t	f	2026-04-01 07:11:58.899705
24	9	BAND-001	124	97.60345812584858	38.35567511843026	166	94	0	Detected	High	Low	59	Moderate	4	6h 30m	85	t	f	2026-04-01 07:12:00.921349
25	9	BAND-001	133	90.34517245957431	38.58501254329803	136	106	6	Detected	Low	Low	39	Low	5	6h 30m	85	t	f	2026-04-01 07:12:02.943898
26	9	BAND-001	90	95.73702118394843	38.98498388007036	158	103	0	Normal	Low	Low	40	Moderate	4	6h 30m	85	t	f	2026-04-01 07:19:20.167751
27	9	BAND-001	134	98.06271921532827	37.09361088334391	118	100	3	Detected	Low	Low	38	Low	5	6h 30m	85	t	f	2026-04-01 07:19:22.193331
28	9	BAND-001	122	92.15684436785139	37.27158263919059	157	102	0	Detected	Low	Low	47	High	7	6h 30m	85	t	f	2026-04-01 07:19:24.212347
29	9	BAND-001	113	98.53607661951067	38.59029133821605	126	110	0	Normal	Low	Low	37	Moderate	7	6h 30m	85	t	f	2026-04-01 07:19:26.230389
30	9	BAND-001	119	88.26499778127518	37.806613822552805	138	70	3	Normal	Low	Low	32	Moderate	7	6h 30m	85	t	f	2026-04-01 07:19:28.259077
31	9	BAND-001	138	92.78300784792891	36.562404199785796	130	78	3	Detected	Low	Low	51	High	1	6h 30m	85	t	f	2026-04-01 07:19:30.275039
32	9	BAND-001	109	92.99024855756976	38.12981595840224	173	93	0	Normal	Low	Low	57	Moderate	6	6h 30m	85	t	f	2026-04-01 07:59:40.315704
33	9	BAND-001	115	98.88299657166334	38.33474633375499	173	73	0	Normal	High	Low	43	Moderate	1	6h 30m	85	t	f	2026-04-01 07:59:42.337398
34	9	BAND-001	107	96.3356007590074	37.00162699903314	163	79	0	Normal	Low	Low	54	Low	8	6h 30m	85	t	f	2026-04-01 07:59:44.359536
35	9	BAND-001	130	88.23733944270974	38.05322061146645	114	101	3	Detected	Low	Low	48	Low	7	6h 30m	85	t	f	2026-04-01 07:59:46.388192
36	9	BAND-001	106	91.78076548977617	36.955810686156575	122	92	0	Normal	Low	Low	37	Low	2	6h 30m	85	t	f	2026-04-01 08:01:21.219899
37	9	BAND-001	95	98.68247945331476	37.685091941516994	170	105	0	Normal	Low	Low	33	High	4	6h 30m	85	t	f	2026-04-01 08:01:23.239286
38	9	BAND-001	132	96.9057872841258	38.48568253120182	132	100	3	Detected	Low	Low	49	Low	8	6h 30m	85	t	f	2026-04-01 08:01:25.251875
39	9	BAND-001	135	96.85438816752591	37.35502541735173	159	80	3	Detected	Low	Low	44	Low	9	6h 30m	85	t	f	2026-04-01 08:01:27.265009
40	9	BAND-001	103	88.21983337344525	36.55609213512097	164	91	3	Normal	Low	Low	49	Moderate	4	6h 30m	85	t	f	2026-04-01 08:01:29.294114
41	9	BAND-001	90	88.680868060856	38.83642048551438	134	95	3	Normal	Low	Low	45	Low	10	6h 30m	85	t	f	2026-04-01 08:01:31.319004
42	9	BAND-001	123	93.05661716305754	37.7080067268986	121	79	0	Detected	Low	Low	53	Low	3	6h 30m	85	t	f	2026-04-01 08:01:33.342527
43	9	BAND-001	109	97.95568303220945	37.36763168110097	158	92	0	Normal	Low	Low	41	Moderate	1	6h 30m	85	t	f	2026-04-01 08:01:35.35735
44	9	BAND-001	72	91.22861718873995	38.959460025204095	153	90	0	Normal	Low	Low	56	High	9	6h 30m	85	t	f	2026-04-01 08:01:37.376
45	9	BAND-001	110	96.19001248117306	36.99943908405165	151	88	0	Normal	Low	Low	60	Low	6	6h 30m	85	t	f	2026-04-01 08:01:39.389892
46	9	BAND-001	121	90.56747650773129	36.63040887088412	147	90	3	Detected	Low	Low	33	Moderate	2	6h 30m	85	t	f	2026-04-01 08:01:41.400905
47	9	BAND-001	90	89.79611102730985	38.44527873152972	173	84	3	Normal	Low	Low	38	High	6	6h 30m	85	t	f	2026-04-01 08:01:43.429368
48	9	BAND-001	106	93.31515764947123	37.878867100609234	139	88	0	Normal	Low	Low	31	High	5	6h 30m	85	t	f	2026-04-01 08:01:45.444748
49	9	BAND-001	70	88.97670431209204	36.83290939306372	138	92	3	Normal	Low	Low	54	Moderate	6	6h 30m	85	t	f	2026-04-01 08:01:47.457935
50	9	BAND-001	138	89.91853578842303	37.11063083990547	166	71	6	Detected	High	Low	45	Low	4	6h 30m	85	t	f	2026-04-01 08:01:49.468902
51	9	BAND-001	92	91.55802095232353	38.33391581358988	167	104	0	Normal	Low	Low	45	High	1	6h 30m	85	t	f	2026-04-01 08:01:51.483574
52	9	BAND-001	129	92.31392521365285	36.62444967435702	152	73	0	Detected	Low	Low	33	Moderate	5	6h 30m	85	t	f	2026-04-01 08:01:53.499369
53	9	BAND-001	97	91.4312915916991	38.15585588448234	151	84	0	Normal	Low	Low	30	High	7	6h 30m	85	t	f	2026-04-01 08:01:55.52259
54	9	BAND-001	81	94.85878386570002	36.52855525095091	174	75	0	Normal	Low	Low	56	High	6	6h 30m	85	t	f	2026-04-01 08:01:57.544862
55	9	BAND-001	105	97.52664589056567	38.267965411866946	155	83	0	Normal	Low	Low	37	High	8	6h 30m	85	t	f	2026-04-01 08:01:59.564936
56	9	BAND-001	136	95.78553043771757	37.32074758606704	145	93	3	Detected	Low	Low	58	High	5	6h 30m	85	t	f	2026-04-01 08:02:01.581157
57	9	BAND-001	120	92.50982931916585	38.12315038294618	168	100	0	Detected	High	Low	34	Moderate	8	6h 30m	85	t	f	2026-04-01 08:02:03.603035
58	9	BAND-001	111	88.69855524471677	36.5526960865942	151	87	3	Normal	Low	Low	55	High	2	6h 30m	85	t	f	2026-04-01 08:02:05.632899
59	9	BAND-001	108	90.55316146048726	36.573696548844865	150	79	3	Normal	Low	Low	35	Low	8	6h 30m	85	t	f	2026-04-01 08:13:14.637851
60	9	BAND-001	108	90.759319260371	38.76379333176598	143	103	3	Normal	Low	Low	38	Low	9	6h 30m	85	t	f	2026-04-01 08:13:16.660996
61	9	BAND-001	122	92.82492625442235	36.68499646525139	174	77	0	Detected	High	Low	56	High	10	6h 30m	85	t	f	2026-04-01 08:13:18.685139
62	9	BAND-001	133	89.91339751554972	37.24379558375394	153	74	6	Detected	Low	Low	47	High	3	6h 30m	85	t	f	2026-04-01 08:13:20.711897
63	9	BAND-001	85	96.7589533568035	38.823560064324276	127	81	0	Normal	Low	Low	48	High	6	6h 30m	85	t	f	2026-04-01 08:13:22.735225
64	9	BAND-001	109	89.44484353835898	37.7712089027823	150	110	3	Normal	Low	Low	56	Moderate	9	6h 30m	85	t	f	2026-04-01 08:13:24.759461
65	9	BAND-001	87	92.1617781752748	37.34688407510356	120	82	0	Normal	Low	Low	31	Low	7	6h 30m	85	t	f	2026-04-01 08:13:26.782696
66	9	BAND-001	80	91.21662438586819	37.5921036470369	141	103	0	Normal	Low	Low	53	Moderate	5	6h 30m	85	t	f	2026-04-01 08:13:28.805841
67	9	BAND-001	79	91.44628800415043	37.80794761298925	162	82	0	Normal	Low	Low	35	High	1	6h 30m	85	t	f	2026-04-01 08:13:30.826344
68	9	BAND-001	112	94.36837506877202	36.71296241940348	127	93	0	Normal	Low	Low	43	Low	2	6h 30m	85	t	f	2026-04-01 08:13:32.848822
69	9	BAND-001	143	94.33152150430543	36.53801704437996	164	88	3	Detected	High	Low	31	Low	10	6h 30m	85	t	f	2026-04-01 08:13:34.865672
70	9	BAND-001	73	96.49511497174025	38.13736845288613	110	97	0	Normal	Low	Low	53	High	4	6h 30m	85	t	f	2026-04-01 08:13:36.885662
71	9	BAND-001	111	90.73636333097184	37.175254160777705	164	83	3	Normal	High	Low	51	Low	8	6h 30m	85	t	f	2026-04-01 08:13:38.904474
72	9	BAND-001	78	92.05661046198608	38.98775201936637	132	71	0	Normal	Low	Low	32	High	8	6h 30m	85	t	f	2026-04-01 08:13:40.926175
73	9	BAND-001	110	89.3701626485365	37.525186037571316	130	95	3	Normal	Low	Low	52	Moderate	8	6h 30m	85	t	f	2026-04-01 08:13:42.948026
74	9	BAND-001	128	96.64993506916468	37.285869548989375	130	81	0	Detected	Low	Low	30	Moderate	4	6h 30m	85	t	f	2026-04-01 08:13:44.971177
75	9	BAND-001	88	96.4528270434016	38.6900917676881	139	102	0	Normal	Low	Low	42	Low	10	6h 30m	85	t	f	2026-04-01 08:13:46.991064
76	9	BAND-001	95	90.53778749516943	38.81482991692776	136	86	3	Normal	Low	Low	30	High	2	6h 30m	85	t	f	2026-04-01 08:13:49.009599
77	9	BAND-001	105	90.71970492488744	38.49851406185811	151	107	3	Normal	Low	Low	45	Moderate	4	6h 30m	85	t	f	2026-04-01 08:13:51.023903
78	9	BAND-001	98	92.62410341808106	37.57846669735142	161	70	0	Normal	Low	Low	32	Moderate	7	6h 30m	85	t	f	2026-04-01 08:18:45.423368
79	9	BAND-001	144	95.69474513963027	37.18592184291385	162	89	3	Detected	High	Low	49	High	10	6h 30m	85	t	f	2026-04-01 15:39:16.914195
80	9	BAND-001	70	97.7769652245984	37.83977603788384	134	76	0	Normal	Low	Low	40	Low	5	6h 30m	85	t	f	2026-04-01 15:39:18.93834
81	9	BAND-001	133	90.53201619927127	38.47382821524468	169	104	6	Detected	High	Low	31	High	2	6h 30m	85	t	f	2026-04-01 15:39:20.963952
82	9	BAND-001	99	92.82657867995688	36.74822232824712	175	98	0	Normal	Low	Low	49	Moderate	7	6h 30m	85	t	f	2026-04-01 15:39:22.988309
83	9	BAND-001	137	89.5525958177148	37.23230253521848	121	92	6	Detected	Low	Low	53	High	2	6h 30m	85	t	f	2026-04-01 15:39:25.010399
84	9	BAND-001	145	97.43749958102103	38.385870268926006	125	85	3	Detected	Low	Low	49	High	2	6h 30m	85	t	f	2026-04-01 15:39:27.035541
85	9	BAND-001	117	93.81514123980095	38.12726689971765	138	83	0	Normal	Low	Low	51	Low	10	6h 30m	85	t	f	2026-04-01 15:39:29.054151
86	9	BAND-001	72	95.61606614331836	38.1401010785069	148	101	0	Normal	Low	Low	39	High	3	6h 30m	85	t	f	2026-04-01 15:39:31.07323
87	9	BAND-001	131	88.825967395931	36.77512240544608	162	97	6	Detected	High	Low	57	Moderate	1	6h 30m	85	t	f	2026-04-01 15:39:33.094446
88	9	BAND-001	104	89.16035220485608	36.84677059480369	175	110	3	Normal	Low	Low	45	Low	9	6h 30m	85	t	f	2026-04-01 15:39:35.112048
89	9	BAND-001	92	89.29861522613994	36.98913244507717	170	71	3	Normal	Low	Low	42	High	4	6h 30m	85	t	f	2026-04-01 15:39:37.128218
90	9	BAND-001	103	93.1859488498836	38.463690226972055	117	75	0	Normal	Low	Low	51	Low	9	6h 30m	85	t	f	2026-04-01 15:39:39.143211
91	9	BAND-001	89	97.01640351012442	37.83064586354938	151	78	0	Normal	Low	Low	50	Low	1	6h 30m	85	t	f	2026-04-01 15:39:41.155813
92	9	BAND-001	100	91.87955624114387	36.90785014672707	144	85	0	Normal	Low	Low	51	Low	8	6h 30m	85	t	f	2026-04-01 15:39:43.172958
93	9	BAND-001	121	94.80487759740927	37.38072740242224	134	109	0	Detected	Low	Low	41	Moderate	8	6h 30m	85	t	f	2026-04-01 15:41:12.555932
94	9	BAND-001	116	89.6445486498509	37.05529825758666	149	75	3	Normal	Low	Low	41	High	2	6h 30m	85	t	f	2026-04-01 15:41:14.575648
95	9	BAND-001	84	93.17367119673506	38.63969028436121	151	78	0	Normal	Low	Low	46	High	4	6h 30m	85	t	f	2026-04-01 15:41:16.594905
96	9	BAND-001	99	93.16398176363654	38.807155356836695	127	97	0	Normal	Low	Low	31	Moderate	9	6h 30m	85	t	f	2026-04-01 15:41:18.62406
97	9	BAND-001	101	91.37005645588192	36.682295855100385	121	85	0	Normal	Low	Low	53	High	9	6h 30m	85	t	f	2026-04-01 15:41:20.647797
98	9	BAND-001	80	97.52338026641361	37.58887786752827	156	109	0	Normal	Low	Low	53	High	8	6h 30m	85	t	f	2026-04-01 15:41:22.661983
99	9	BAND-001	109	91.3797834845622	36.88147055046169	142	86	0	Normal	Low	Low	43	High	3	6h 30m	85	t	f	2026-04-01 15:41:24.688751
100	9	BAND-001	117	91.56165030792609	37.39923114625916	120	92	0	Normal	Low	Low	31	Low	5	6h 30m	85	t	f	2026-04-01 15:41:26.714152
101	9	BAND-001	115	90.61999897295233	38.33642190469796	156	83	3	Normal	Low	Low	41	Moderate	4	6h 30m	85	t	f	2026-04-01 15:41:28.732274
102	9	BAND-001	103	92.82377265424215	38.46003988764235	161	78	0	Normal	Low	Low	45	Moderate	9	6h 30m	85	t	f	2026-04-01 15:41:30.745971
103	9	BAND-001	72	97.76465441486843	37.945865029636444	141	92	0	Normal	Low	Low	50	High	3	6h 30m	85	t	f	2026-04-01 15:41:32.758759
104	9	BAND-001	145	96.21652739185109	37.308173215653106	171	78	3	Detected	High	Low	35	High	5	6h 30m	85	t	f	2026-04-01 15:41:34.777996
105	9	BAND-001	96	95.54635066448458	37.31199980182154	159	106	0	Normal	Low	Low	35	Moderate	9	6h 30m	85	t	f	2026-04-01 15:41:36.805203
106	9	BAND-001	86	98.31238651066965	38.003969984414965	155	76	0	Normal	Low	Low	38	High	5	6h 30m	85	t	f	2026-04-01 15:41:38.825886
107	9	BAND-001	135	89.91071592513588	38.580510236177496	142	93	6	Detected	Low	Low	58	High	7	6h 30m	85	t	f	2026-04-01 15:41:40.847488
108	9	BAND-001	113	92.86963599914822	36.98710444309706	175	88	0	Normal	High	Low	30	Moderate	5	6h 30m	85	t	f	2026-04-01 15:41:42.86177
109	9	BAND-001	94	94.1853240993369	37.62043070599613	124	79	0	Normal	Low	Low	40	Low	4	6h 30m	85	t	f	2026-04-01 15:41:44.877672
110	9	BAND-001	110	93.87637800489684	36.91491823416637	160	81	0	Normal	Low	Low	60	High	1	6h 30m	85	t	f	2026-04-01 15:41:46.895751
111	9	BAND-001	126	94.76361398190159	38.37669561764156	123	110	0	Detected	Low	Low	35	Moderate	4	6h 30m	85	t	f	2026-04-01 15:41:48.919426
112	9	BAND-001	81	92.94115867827526	38.636159876670945	121	70	0	Normal	Low	Low	54	Moderate	5	6h 30m	85	t	f	2026-04-01 15:41:50.950362
113	9	BAND-001	89	95.35893851467607	37.313206947462156	169	85	0	Normal	Low	Low	50	High	2	6h 30m	85	t	f	2026-04-01 15:41:52.969129
114	9	BAND-001	85	97.5912861540541	36.82844648689375	110	70	0	Normal	Low	Low	34	Moderate	4	6h 30m	85	t	f	2026-04-01 15:41:54.992546
115	9	BAND-001	122	93.75752062971787	37.18481355582739	151	104	0	Detected	Low	Low	50	Moderate	9	6h 30m	85	t	f	2026-04-01 15:41:57.018766
116	9	BAND-001	132	89.3383420430102	38.5031630233602	147	106	6	Detected	Low	Low	53	Low	8	6h 30m	85	t	f	2026-04-01 15:41:59.042409
117	9	BAND-001	122	91.07525920366167	38.47612781082784	153	108	0	Detected	Low	Low	57	Low	6	6h 30m	85	t	f	2026-04-01 15:42:01.055484
118	9	BAND-001	89	92.7906987149031	38.123780913192164	111	97	0	Normal	Low	Low	31	Moderate	10	6h 30m	85	t	f	2026-04-01 15:42:03.070548
119	9	BAND-001	101	95.48961055255258	36.53925558983728	173	94	0	Normal	Low	Low	45	Low	6	6h 30m	85	t	f	2026-04-01 15:42:05.091552
120	9	BAND-001	143	96.24127083632003	36.69283964920707	151	82	3	Detected	Low	Low	33	High	3	6h 30m	85	t	f	2026-04-01 15:42:07.108205
121	9	BAND-001	136	89.86152757627684	37.08403454613166	175	91	6	Detected	High	Low	30	Low	9	6h 30m	85	t	f	2026-04-01 15:42:09.12647
122	9	BAND-001	91	91.48477990586105	38.532178780975975	149	85	0	Normal	Low	Low	51	High	9	6h 30m	85	t	f	2026-04-01 15:42:11.142037
123	9	BAND-001	93	89.60645031055778	38.14452754544301	172	81	3	Normal	Low	Low	38	Moderate	1	6h 30m	85	t	f	2026-04-01 15:42:13.159845
124	9	BAND-001	90	88.64559936070232	38.754009815305736	140	92	3	Normal	Low	Low	54	Moderate	3	6h 30m	85	t	f	2026-04-01 15:42:15.175344
125	9	BAND-001	71	91.96895634107395	36.523129597163766	127	99	0	Normal	Low	Low	46	Moderate	5	6h 30m	85	t	f	2026-04-01 15:42:17.195285
126	9	BAND-001	98	95.50823360399092	36.511420510529234	173	97	0	Normal	Low	Low	59	High	3	6h 30m	85	t	f	2026-04-01 15:42:19.217979
127	9	BAND-001	87	97.1264448426274	38.85298207568848	163	87	0	Normal	Low	Low	52	Low	1	6h 30m	85	t	f	2026-04-01 15:42:21.240622
128	9	BAND-001	127	96.71033948636769	36.877843227108684	152	91	0	Detected	Low	Low	34	Low	9	6h 30m	85	t	f	2026-04-01 15:42:23.255179
129	9	BAND-001	82	89.16379524997525	37.621748937606824	128	103	3	Normal	Low	Low	40	High	9	6h 30m	85	t	f	2026-04-01 15:42:25.278372
130	9	BAND-001	136	98.15877121235314	37.976627156528224	143	110	3	Detected	Low	Low	55	Moderate	9	6h 30m	85	t	f	2026-04-01 15:42:27.301718
131	9	BAND-001	129	98.09586021764157	36.820896697677725	147	89	0	Detected	Low	Low	45	Low	7	6h 30m	85	t	f	2026-04-01 15:42:29.321752
132	9	BAND-001	133	96.6354188305074	38.777158324486635	152	85	3	Detected	Low	Low	37	High	4	6h 30m	85	t	f	2026-04-01 15:42:31.348856
133	9	BAND-001	89	95.24766224309035	37.85220173548102	141	83	0	Normal	Low	Low	54	Moderate	2	6h 30m	85	t	f	2026-04-01 15:42:33.368584
134	9	BAND-001	70	95.24119839348566	38.37838459605197	172	97	0	Normal	Low	Low	53	Moderate	5	6h 30m	85	t	f	2026-04-01 15:42:35.390328
135	9	BAND-001	88	90.35097172063452	36.79360246620753	111	71	3	Normal	Low	Low	47	High	8	6h 30m	85	t	f	2026-04-01 15:42:37.413071
136	9	BAND-001	145	89.88251330340273	38.81788625973596	145	96	6	Detected	Low	Low	53	Low	9	6h 30m	85	t	f	2026-04-01 15:42:39.436824
137	9	BAND-001	79	94.73427710375637	38.22294105025495	160	72	0	Normal	Low	Low	54	High	6	6h 30m	85	t	f	2026-04-01 15:42:41.453671
138	9	BAND-001	134	88.15730758714055	37.56144623550095	141	75	6	Detected	Low	Low	38	High	3	6h 30m	85	t	f	2026-04-01 15:42:43.478788
139	9	BAND-001	119	98.77556944759755	37.497126795277175	142	85	0	Normal	Low	Low	48	High	1	6h 30m	85	t	f	2026-04-01 15:42:45.496112
140	9	BAND-001	101	88.10821932791471	36.50054730201525	164	92	3	Normal	Low	Low	47	High	4	6h 30m	85	t	f	2026-04-01 15:42:47.521072
141	9	BAND-001	132	92.1980207674692	38.00852882669632	172	77	3	Detected	High	Low	44	High	10	6h 30m	85	t	f	2026-04-01 15:42:49.542017
142	9	BAND-001	137	91.02076060076294	38.800582378576095	149	110	3	Detected	Low	Low	50	Low	2	6h 30m	85	t	f	2026-04-01 15:42:51.561673
\.


--
-- Data for Name: wards; Type: TABLE DATA; Schema: public; Owner: vitalvue_admin
--

COPY public.wards (id, name, department_id) FROM stdin;
1	Ward 1	1
2	Ward 2	1
3	ER Ward 1	2
4	ICU Ward 1	3
\.


--
-- Name: actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.actions_id_seq', 1, false);


--
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.alerts_id_seq', 31, true);


--
-- Name: clinical_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.clinical_notes_id_seq', 1, false);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.departments_id_seq', 3, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.rooms_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- Name: vitals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.vitals_id_seq', 142, true);


--
-- Name: wards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: vitalvue_admin
--

SELECT pg_catalog.setval('public.wards_id_seq', 4, true);


--
-- Name: actions actions_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: clinical_notes clinical_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: master_admins master_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.master_admins
    ADD CONSTRAINT master_admins_pkey PRIMARY KEY (id);


--
-- Name: nurses nurses_license_no_key; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.nurses
    ADD CONSTRAINT nurses_license_no_key UNIQUE (license_no);


--
-- Name: nurses nurses_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.nurses
    ADD CONSTRAINT nurses_pkey PRIMARY KEY (id);


--
-- Name: org_admins org_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);


--
-- Name: ix_actions_patient_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_actions_patient_id ON public.actions USING btree (patient_id);


--
-- Name: ix_alerts_created_at; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_alerts_created_at ON public.alerts USING btree (created_at);


--
-- Name: ix_alerts_patient_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_alerts_patient_id ON public.alerts USING btree (patient_id);


--
-- Name: ix_alerts_ward_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_alerts_ward_id ON public.alerts USING btree (ward_id);


--
-- Name: ix_clinical_notes_patient_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_clinical_notes_patient_id ON public.clinical_notes USING btree (patient_id);


--
-- Name: ix_departments_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_departments_id ON public.departments USING btree (id);


--
-- Name: ix_organizations_city; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_organizations_city ON public.organizations USING btree (city);


--
-- Name: ix_organizations_country; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_organizations_country ON public.organizations USING btree (country);


--
-- Name: ix_organizations_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_organizations_id ON public.organizations USING btree (id);


--
-- Name: ix_organizations_state; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_organizations_state ON public.organizations USING btree (state);


--
-- Name: ix_patients_device_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE UNIQUE INDEX ix_patients_device_id ON public.patients USING btree (device_id);


--
-- Name: ix_rooms_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_rooms_id ON public.rooms USING btree (id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_user_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE UNIQUE INDEX ix_users_user_id ON public.users USING btree (user_id);


--
-- Name: ix_vitals_created_at; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_vitals_created_at ON public.vitals USING btree (created_at);


--
-- Name: ix_vitals_device_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_vitals_device_id ON public.vitals USING btree (device_id);


--
-- Name: ix_vitals_heart_rate; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_vitals_heart_rate ON public.vitals USING btree (heart_rate);


--
-- Name: ix_vitals_news2_score; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_vitals_news2_score ON public.vitals USING btree (news2_score);


--
-- Name: ix_vitals_patient_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_vitals_patient_id ON public.vitals USING btree (patient_id);


--
-- Name: ix_vitals_spo2; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_vitals_spo2 ON public.vitals USING btree (spo2);


--
-- Name: ix_wards_id; Type: INDEX; Schema: public; Owner: vitalvue_admin
--

CREATE INDEX ix_wards_id ON public.wards USING btree (id);


--
-- Name: actions actions_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alerts(id);


--
-- Name: actions actions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: actions actions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.users(id);


--
-- Name: alerts alerts_flagged_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_flagged_doctor_id_fkey FOREIGN KEY (flagged_doctor_id) REFERENCES public.doctors(id);


--
-- Name: alerts alerts_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_notes clinical_notes_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: clinical_notes clinical_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.clinical_notes
    ADD CONSTRAINT clinical_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: departments departments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: doctors doctors_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_id_fkey FOREIGN KEY (id) REFERENCES public.users(id);


--
-- Name: master_admins master_admins_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.master_admins
    ADD CONSTRAINT master_admins_id_fkey FOREIGN KEY (id) REFERENCES public.users(id);


--
-- Name: nurses nurses_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.nurses
    ADD CONSTRAINT nurses_id_fkey FOREIGN KEY (id) REFERENCES public.users(id);


--
-- Name: org_admins org_admins_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.org_admins
    ADD CONSTRAINT org_admins_id_fkey FOREIGN KEY (id) REFERENCES public.users(id);


--
-- Name: patients patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: patients patients_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_id_fkey FOREIGN KEY (id) REFERENCES public.users(id);


--
-- Name: patients patients_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES public.nurses(id);


--
-- Name: patients patients_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: rooms rooms_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id);


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: vitals vitals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: wards wards_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vitalvue_admin
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- PostgreSQL database dump complete
--

