-- DDL del esquema inventario_ti (volcado exacto de Hibernate/JPA).
-- Ejecutar en Railway SOLO si se quiere crear a mano; por defecto Spring lo crea al arrancar (ddl-auto=update).
-- Idempotente a nivel de esquema; las tablas asumen BD vacía.
--
-- PostgreSQL database dump
--


-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

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
-- Name: inventario_ti; Type: SCHEMA; Schema: -; Owner: sade
--

CREATE SCHEMA IF NOT EXISTS inventario_ti;



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activos; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.activos (
    id uuid NOT NULL,
    asignacion character varying(255) NOT NULL,
    codigo character varying(255) NOT NULL,
    compra date,
    creado_en timestamp(6) with time zone,
    estado_op character varying(255) NOT NULL,
    garantia_hasta date,
    marca character varying(255),
    modelo character varying(255),
    responsable character varying(255),
    serie character varying(255),
    tipo character varying(255),
    ubicacion character varying(255)
);



--
-- Name: auditoria_esperados; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.auditoria_esperados (
    auditoria_id uuid NOT NULL,
    activo_id uuid
);



--
-- Name: auditorias; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.auditorias (
    id uuid NOT NULL,
    autor uuid,
    autor_nombre character varying(255),
    estado character varying(255),
    fin timestamp(6) with time zone,
    inicio timestamp(6) with time zone,
    ubicacion character varying(255)
);



--
-- Name: historial; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.historial (
    id uuid NOT NULL,
    accion character varying(255),
    activo_id uuid,
    antes character varying(2000),
    autor uuid,
    autor_nombre character varying(255),
    despues character varying(2000),
    fecha timestamp(6) with time zone
);



--
-- Name: lecturas; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.lecturas (
    activo_id uuid NOT NULL,
    auditoria_id uuid NOT NULL,
    leida_en timestamp(6) with time zone,
    origen character varying(255)
);



--
-- Name: registros; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.registros (
    id uuid NOT NULL,
    activo_id uuid,
    cerrada_en timestamp(6) with time zone,
    costo numeric(38,2),
    descripcion character varying(2000),
    estado character varying(255),
    fecha timestamp(6) with time zone,
    proxima date,
    tecnico character varying(255),
    tipo character varying(255)
);



--
-- Name: usuarios; Type: TABLE; Schema: inventario_ti; Owner: sade
--

CREATE TABLE inventario_ti.usuarios (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    nombre character varying(255),
    password_hash character varying(255),
    rol character varying(255) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp(6) with time zone,
    ultimo_acceso timestamp(6) with time zone,
    password_actualizado_en timestamp(6) with time zone,
    token_version integer DEFAULT 0 NOT NULL
);



--
-- Name: activos activos_pkey; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.activos
    ADD CONSTRAINT activos_pkey PRIMARY KEY (id);


--
-- Name: auditorias auditorias_pkey; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.auditorias
    ADD CONSTRAINT auditorias_pkey PRIMARY KEY (id);


--
-- Name: historial historial_pkey; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.historial
    ADD CONSTRAINT historial_pkey PRIMARY KEY (id);


--
-- Name: lecturas lecturas_pkey; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.lecturas
    ADD CONSTRAINT lecturas_pkey PRIMARY KEY (activo_id, auditoria_id);


--
-- Name: registros registros_pkey; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.registros
    ADD CONSTRAINT registros_pkey PRIMARY KEY (id);


--
-- Name: activos uk1l3j3h8sfktomi5puk1u05bvr; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.activos
    ADD CONSTRAINT uk1l3j3h8sfktomi5puk1u05bvr UNIQUE (codigo);


--
-- Name: activos ukgcx5lymdnsvji4lac0od1govt; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.activos
    ADD CONSTRAINT ukgcx5lymdnsvji4lac0od1govt UNIQUE (serie);


--
-- Name: usuarios ukkfsp0s1tflm1cwlj8idhqsad0; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.usuarios
    ADD CONSTRAINT ukkfsp0s1tflm1cwlj8idhqsad0 UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_historial_activo; Type: INDEX; Schema: inventario_ti; Owner: sade
--

CREATE INDEX idx_historial_activo ON inventario_ti.historial USING btree (activo_id);


--
-- Name: idx_registros_activo; Type: INDEX; Schema: inventario_ti; Owner: sade
--

CREATE INDEX idx_registros_activo ON inventario_ti.registros USING btree (activo_id);


--
-- Name: auditoria_esperados fkjn8hkoyfwd4m84son5f0rjfy5; Type: FK CONSTRAINT; Schema: inventario_ti; Owner: sade
--

ALTER TABLE ONLY inventario_ti.auditoria_esperados
    ADD CONSTRAINT fkjn8hkoyfwd4m84son5f0rjfy5 FOREIGN KEY (auditoria_id) REFERENCES inventario_ti.auditorias(id);


--
-- PostgreSQL database dump complete
--


